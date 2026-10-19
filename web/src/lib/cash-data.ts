import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
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
/**
 * Phase 3B / Lot B — `establishmentId` optionnel, utilisé UNIQUEMENT si une
 * nouvelle `CashRegister` doit être créée (bootstrap). Changement strictement
 * additif : chaque appelant qui n'a pas encore été audité pour le
 * multi-tenant (`effectBankTransfer`, `getCurrentCashSession`,
 * `listCashSessions`) continue d'appeler cette fonction avec un seul
 * argument — `establishmentId` reste alors `undefined` -> `null`, exactement
 * le comportement d'avant ce lot, aucune régression.
 */
/**
 * Phase 3C / Lot C1 — la RECHERCHE est désormais elle aussi filtrée par
 * établissement quand il est fourni (même garantie additive que la CRÉATION
 * déjà corrigée en Lot B) : un appelant qui ne le fournit pas obtient
 * exactement le comportement d'avant (aucune régression), mais chaque
 * appelant déjà audité (écriture ET lecture) ne peut plus récupérer la
 * caisse d'un autre établissement.
 */
export async function resolveDefaultCashRegister(client: DbClient = prisma, establishmentId?: string | null) {
  const existing = await client.cashRegister.findFirst({
    where: { active: true, ...(establishmentId ? { establishmentId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return client.cashRegister.create({ data: { name: "Caisse principale", establishmentId: establishmentId ?? null } });
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
/**
 * Phase 3C / Lot C1 — `Payment`/`Expense` n'ont pas de FK vers `CashSession`
 * (seulement bornés par `paidAt`, voir plus haut) : sans filtre explicite,
 * cette agrégation mélangerait les paiements/dépenses CASH de TOUS les
 * établissements tombant dans la même fenêtre de dates. `session` porte
 * déjà son propre `establishmentId` (résolu et vérifié à la création de la
 * session, Lot B) — utilisé ici directement, jamais recalculé depuis une
 * session courante distincte. `BankTransfer`/`CashCorrection` restent bornés
 * par `cashSessionId`, déjà une clé unique vers une session elle-même
 * établissement-scopée — aucun filtre supplémentaire nécessaire là.
 */
export async function computeTheoreticalBalance(
  client: DbClient,
  session: Pick<CashSession, "id" | "openingBalance" | "openedAt" | "closedAt" | "establishmentId">,
): Promise<number> {
  const windowEnd = session.closedAt ?? new Date();
  const establishmentFilter = session.establishmentId ? { establishmentId: session.establishmentId } : {};

  const [cashIn, cashOut, transfersOut, corrections] = await Promise.all([
    client.payment.aggregate({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      _sum: { amount: true },
    }),
    client.expense.aggregate({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
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

/**
 * Session OPEN de la caisse unique, avec son solde théorique courant (ou
 * `null` si aucune session n'est ouverte). Phase 3C / Lot C1 —
 * getCurrentUser() pour résoudre l'établissement, propagé à la fois à la
 * résolution de la caisse et au filtre de la session elle-même.
 */
export async function getCurrentCashSession() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return null;
  }
  const register = await resolveDefaultCashRegister(prisma, user.establishmentId);
  const session = await prisma.cashSession.findFirst({
    where: { cashRegisterId: register.id, status: "OPEN", establishmentId: user.establishmentId },
  });
  if (!session) return null;
  const theoreticalBalance = await computeTheoreticalBalance(prisma, session);
  return { ...session, theoreticalBalance };
}

/** Historique des sessions (les plus récentes d'abord). */
export async function listCashSessions(limit = 20) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  const register = await resolveDefaultCashRegister(prisma, user.establishmentId);
  return prisma.cashSession.findMany({
    where: { cashRegisterId: register.id, establishmentId: user.establishmentId },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

/**
 * Corrections d'une session donnée (les plus récentes d'abord). Phase 3C /
 * Lot C1 — `establishmentId` filtré explicitement (jamais seulement supposé
 * correct via `cashSessionId`, dont la lecture par identifiant n'est pas
 * encore sécurisée — lot distinct).
 */
export async function listCashCorrections(cashSessionId: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.cashCorrection.findMany({
    where: { cashSessionId, establishmentId: user.establishmentId },
    orderBy: { createdAt: "desc" },
  });
}
