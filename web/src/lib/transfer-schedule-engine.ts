import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveDefaultCashRegister, computeTheoreticalBalance } from "@/lib/cash-data";
import { advanceNextRunAt } from "@/lib/transfer-frequency";
import { Prisma } from "@/generated/prisma/client";

/**
 * Plafond de sécurité — nombre maximum d'échéances rattrapées pour UNE
 * programmation au cours d'un seul appel de `catchUpSchedule`. Chaque
 * échéance reste sa propre transaction Serializable courte (jamais une
 * transaction unique interminable) ; ce plafond ne borne que le nombre
 * d'allers-retours Postgres effectués pendant un seul appel (donc un seul
 * rendu de `/caisse/virements`). Une programmation plus en retard que ce
 * plafond reprend son rattrapage, sans duplication ni période sautée, au
 * prochain appel — `nextRunAt` reste l'unique source de vérité de ce qui a
 * déjà été traité. 30 couvre un mois de retard quotidien, ~7 mois de retard
 * hebdomadaire, etc. en un seul appel ; un retard plus important se résorbe
 * sur quelques visites supplémentaires plutôt qu'une par échéance.
 */
export const MAX_PERIODS_PER_SCHEDULE_PER_CALL = 30;

export type CatchUpResult = {
  /** Nombre de virements réellement créés pour cette programmation lors de cet appel. */
  generated: number;
  /** true si le plafond a été atteint avant que la programmation soit réellement à jour — il reste des échéances à rattraper lors d'un prochain appel. */
  reachedCap: boolean;
  /** La dernière erreur rencontrée, si le rattrapage s'est arrêté pour une raison autre qu'être à jour ou avoir atteint le plafond (jamais masquée). */
  stoppedOnError: unknown;
};

function isSerializationConflict(error: unknown): boolean {
  // P2034 = "Transaction failed due to a write conflict or a deadlock.
  // Please retry your transaction" — code Prisma dédié aux conflits
  // d'isolation Serializable sur PostgreSQL. Seul ce code est traité comme
  // un conflit de concurrence attendu ; toute autre erreur est remontée
  // (journalisée par l'appelant), jamais masquée silencieusement comme un
  // simple conflit.
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

/**
 * Rattrape, dans l'ordre chronologique et sans sauter ni dupliquer la
 * moindre échéance, les périodes dues d'UNE programmation identifiée par
 * `scheduleId` (jusqu'à `MAX_PERIODS_PER_SCHEDULE_PER_CALL`). Chaque
 * échéance est traitée dans sa propre transaction Serializable courte, qui
 * relit systématiquement la programmation depuis la base (jamais une
 * valeur mise en cache d'une itération précédente ou d'un appel
 * concurrent) — si une exécution concurrente a déjà avancé `nextRunAt`,
 * cette relecture le voit avant de retraiter quoi que ce soit.
 *
 * Reprend EXACTEMENT le comportement métier déjà en place (Bloc 17.2/G) :
 * compte bancaire désactivé ou montant nul → `nextRunAt` avancé sans
 * création de virement ; montant FIXED ou PERCENTAGE (plafonné au
 * disponible théorique de la caisse) inchangés. Seule différence avec le
 * comportement d'origine : `scheduledAt` du virement créé est désormais
 * l'échéance théorique réellement traitée (`fresh.nextRunAt` au moment de
 * cette itération), plus l'instant de génération — cohérent avec son
 * usage ailleurs dans l'application (champ "Date prévue" côté création
 * manuelle, affiché "Prévu le ..." sur /caisse/virements).
 */
export async function catchUpSchedule(scheduleId: string, now: Date): Promise<CatchUpResult> {
  let generated = 0;

  for (let iteration = 0; iteration < MAX_PERIODS_PER_SCHEDULE_PER_CALL; iteration++) {
    let caughtUp = false;

    try {
      await prisma.$transaction(
        async (tx) => {
          const fresh = await tx.transferSchedule.findUnique({ where: { id: scheduleId } });
          if (!fresh || !fresh.active || fresh.nextRunAt > now) {
            caughtUp = true;
            return;
          }

          const dueAt = fresh.nextRunAt;
          // Lot "Virements mensuels — ancre durable" : `fresh.anchorDay`
          // relu depuis la base à chaque itération (même discipline que le
          // reste de cette transaction) — jamais dérivé de `dueAt`, qui
          // peut déjà être une date clampée par un mois court.
          const nextRunAt = advanceNextRunAt(dueAt, fresh.frequency, fresh.anchorDay);

          const account = await tx.bankAccount.findUnique({ where: { id: fresh.bankAccountId } });
          if (!account || !account.active) {
            await tx.transferSchedule.update({ where: { id: fresh.id }, data: { nextRunAt } });
            return;
          }

          let amount: number;
          if (fresh.amountType === "FIXED") {
            amount = fresh.fixedAmount!;
          } else {
            const register = await resolveDefaultCashRegister(tx);
            const session = await tx.cashSession.findFirst({
              where: { cashRegisterId: register.id, status: "OPEN" },
            });
            const available = session ? await computeTheoreticalBalance(tx, session) : 0;
            const raw = Math.floor((available * fresh.percentage!) / 100);
            amount = Math.min(raw, available);
          }

          if (amount <= 0) {
            await tx.transferSchedule.update({ where: { id: fresh.id }, data: { nextRunAt } });
            return;
          }

          await tx.bankTransfer.create({
            data: {
              bankAccountId: fresh.bankAccountId,
              amount,
              status: "SCHEDULED",
              scheduledAt: dueAt,
              createdByUserId: fresh.createdByUserId,
              transferScheduleId: fresh.id,
            },
          });

          await tx.transferSchedule.update({ where: { id: fresh.id }, data: { nextRunAt } });

          generated++;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      return { generated, reachedCap: false, stoppedOnError: error };
    }

    if (caughtUp) {
      return { generated, reachedCap: false, stoppedOnError: null };
    }
  }

  return { generated, reachedCap: true, stoppedOnError: null };
}

export { isSerializationConflict };
