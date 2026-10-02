import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { Prisma, CashSession } from "@/generated/prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * Bloc 17.2 — V1 n'utilise qu'une seule caisse (Bloc 17.1 décision A).
 * Aucune page de gestion multi-caisse n'existe encore, et `seed.ts` n'a
 * volontairement pas été touché pour ce bloc (hors périmètre de l'Étape D,
 * "aucune modification inutile des modules existants") : ce helper résout
 * la caisse unique, et la crée une seule fois si elle n'existe pas encore
 * (bootstrap idempotent — mêmes garanties qu'un `findFirst` suivi d'un
 * `create` protégé par la transaction appelante). Utilisable aussi bien
 * hors transaction (lecture) qu'à l'intérieur d'une transaction déjà
 * ouverte par un appelant (`src/app/actions/cash.ts`/`bank.ts`).
 */
export async function resolveDefaultCashRegister(client: DbClient = prisma) {
  const existing = await client.cashRegister.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return client.cashRegister.create({ data: { name: "Caisse principale" } });
}

/**
 * Bloc 17.1 section 5 / Bloc 17.2 BLOC 10 — solde théorique, calculé à la
 * demande, jamais stocké tant que la session est OPEN (seul
 * `closingTheoreticalBalance` est écrit, une seule fois, à la clôture).
 *
 * Fenêtre `[openedAt, closedAt)` pour une session fermée, `[openedAt, now)`
 * pour une session ouverte. `Payment`/`Expense` (qui n'ont pas de FK vers
 * `CashSession` — aucune modification de ces modèles dans ce bloc) sont
 * bornés par `paidAt` dans cette fenêtre ; `BankTransfer`/`CashCorrection`
 * (qui ont leur propre `cashSessionId`) sont bornés par cette FK
 * directement — plus précis qu'un recoupement par date, et cohérent avec
 * le fait que `cashSessionId` n'est résolu qu'au moment de l'EFFET réel.
 */
export async function computeTheoreticalBalance(
  client: DbClient,
  session: Pick<CashSession, "id" | "openingBalance" | "openedAt" | "closedAt">,
): Promise<number> {
  const windowEnd = session.closedAt ?? new Date();

  const [cashIn, cashOut, transfersOut, corrections] = await Promise.all([
    client.payment.aggregate({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd } },
      _sum: { amount: true },
    }),
    client.expense.aggregate({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd } },
      _sum: { amount: true },
    }),
    client.bankTransfer.aggregate({
      where: { status: "EFFECTED", cashSessionId: session.id },
      _sum: { amount: true },
    }),
    client.cashCorrection.aggregate({
      where: { cashSessionId: session.id },
      _sum: { amount: true },
    }),
  ]);

  return (
    session.openingBalance +
    (cashIn._sum.amount ?? 0) -
    (cashOut._sum.amount ?? 0) -
    (transfersOut._sum.amount ?? 0) +
    (corrections._sum.amount ?? 0)
  );
}

/** Session OPEN de la caisse unique, avec son solde théorique courant (ou `null` si aucune session n'est ouverte). */
export async function getCurrentCashSession() {
  await verifySession();
  const register = await resolveDefaultCashRegister();
  const session = await prisma.cashSession.findFirst({
    where: { cashRegisterId: register.id, status: "OPEN" },
  });
  if (!session) return null;
  const theoreticalBalance = await computeTheoreticalBalance(prisma, session);
  return { ...session, theoreticalBalance };
}

/** Historique des sessions (les plus récentes d'abord). */
export async function listCashSessions(limit = 20) {
  await verifySession();
  const register = await resolveDefaultCashRegister();
  return prisma.cashSession.findMany({
    where: { cashRegisterId: register.id },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

/** Corrections d'une session donnée (les plus récentes d'abord). */
export async function listCashCorrections(cashSessionId: string) {
  await verifySession();
  return prisma.cashCorrection.findMany({
    where: { cashSessionId },
    orderBy: { createdAt: "desc" },
  });
}
