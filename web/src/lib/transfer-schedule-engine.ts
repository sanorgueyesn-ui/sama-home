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
  //
  // Phase 3G / Lot D12-P36 — depuis l'ajout de la contrainte unique
  // `BankTransfer_schedule_date_unique` (D12-P32 à P35), une violation
  // porte le code Prisma P2002, jamais P2034 : cette comparaison exacte
  // continue de l'exclure correctement (déjà vrai avant la contrainte,
  // désormais vérifié pertinent). Un P2002 tombe donc dans le même chemin
  // que toute autre erreur inattendue — jamais traité comme un aléa de
  // concurrence silencieux, jamais une reprise automatique ajoutée ici.
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

/**
 * Phase 3G / Lot D12-P39 — reconnaît spécifiquement une violation de la
 * contrainte `BankTransfer_schedule_date_unique` (D12-P36), confirmée
 * empiriquement par un test de concurrence réel (D12-P37) : la ligne de
 * transaction concurrente perdante échoue avec le code Prisma P2002,
 * jamais P2034 — une variante bénigne de concurrence perdue (un seul
 * virement committé pour l'échéance, exactement comme voulu), simplement
 * détectée une étape plus tard que le cas `caughtUp` (après la tentative
 * d'insertion plutôt qu'avant).
 *
 * `error.meta` est typé `Record<string, unknown>` par Prisma lui-même
 * (aucune garantie structurelle sur `target`, jamais vérifié empiriquement
 * dans ce projet pour ce code d'erreur précis) — DÉLIBÉRÉMENT PAS utilisé
 * ici pour éviter une détection fragile fondée sur une supposition. Le
 * message, lui, a été empiriquement capturé lors du test D12-P37 et nomme
 * la contrainte de façon explicite et non ambiguë ("Unique constraint
 * failed on the constraint: `BankTransfer_schedule_date_unique`") — c'est
 * la seule base utilisée ici. Si le format du message venait à changer
 * dans une future version de Prisma, cette fonction retourne simplement
 * `false` : l'erreur retombe alors dans le journal générique "échec
 * inattendu" déjà existant, jamais masquée.
 */
function isBankTransferScheduleDateUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    typeof error.message === "string" &&
    error.message.includes("BankTransfer_schedule_date_unique")
  );
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

          // Phase 3B / Lot B2 — aucun utilisateur n'est à l'origine de cette
          // génération paresseuse (déclenchée par la simple consultation de
          // /caisse/virements par n'importe quel utilisateur authentifié,
          // voir le commentaire de generateDueScheduledTransfers dans
          // src/app/actions/bank.ts) : l'établissement du virement généré ne
          // peut donc PAS venir d'une session en cours. Il vient exclusivement
          // de la programmation elle-même (`fresh.establishmentId`, déjà
          // résolu et vérifié à sa création — createTransferSchedule), revérifié
          // cohérent avec son propre compte bancaire — jamais un repli sur
          // l'établissement historique, jamais une valeur devinée. Si l'un des
          // deux est absent ou s'ils diffèrent, cette programmation précise
          // arrête son propre traitement (erreur non masquée, voir le
          // `console.error` de l'appelant) sans affecter les autres
          // programmations dues traitées par le même appel : aucun mélange
          // possible entre échéanciers de deux établissements différents,
          // chaque itération ne lisant/écrivant jamais que ses propres
          // données.
          if (!fresh.establishmentId || !account.establishmentId || fresh.establishmentId !== account.establishmentId) {
            throw new Error(
              `Programmation ${fresh.id} : établissement introuvable ou incohérent avec son compte bancaire — génération automatique arrêtée pour cette programmation.`,
            );
          }
          const establishmentId = fresh.establishmentId;

          let amount: number;
          if (fresh.amountType === "FIXED") {
            amount = fresh.fixedAmount!;
          } else {
            const register = await resolveDefaultCashRegister(tx, establishmentId);
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
              establishmentId,
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

export { isSerializationConflict, isBankTransferScheduleDateUniqueViolation };
