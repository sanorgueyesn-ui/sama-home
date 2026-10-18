import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { CashSession } from "@/generated/prisma/client";

/**
 * Bloc E (UI Caisse) — lecture uniquement, fichier NEUF, n'importe ni ne
 * modifie `src/lib/cash-data.ts` (gelé). Les 4 agrégations ci-dessous
 * reproduisent EXACTEMENT la même fenêtre et les mêmes 4 sources que
 * `computeTheoreticalBalance` (Bloc 17.2, Étape D) — juste exposées en
 * détail (entrée/sortie/versements/corrections) au lieu d'un seul total,
 * pour "Décomposition du solde" (section 7). Aucune règle de calcul
 * nouvelle : la somme des 4 composantes ci-dessous doit toujours égaler
 * exactement le `theoreticalBalance` déjà renvoyé par
 * `getCurrentCashSession()` — vérifié explicitement par test.
 *
 * Phase 3C / Lot C1 — même filtre `establishmentId` que
 * `computeTheoreticalBalance` (src/lib/cash-data.ts), pour la même raison :
 * `Payment`/`Expense` n'ont pas de FK vers `CashSession`, seulement bornés
 * par date — sans ce filtre, un autre établissement avec des mouvements
 * CASH dans la même fenêtre serait compté ici. `establishmentId` vient de
 * la session elle-même (déjà établissement-scopée), jamais recalculé.
 */
export async function getCashSessionBreakdown(
  session: Pick<CashSession, "id" | "openingBalance" | "openedAt" | "closedAt" | "establishmentId">,
) {
  await verifySession();
  const windowEnd = session.closedAt ?? new Date();
  const establishmentFilter = session.establishmentId ? { establishmentId: session.establishmentId } : {};

  const [cashInAgg, cashOutAgg, transfersOutAgg, correctionsAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      _sum: { amount: true },
    }),
    prisma.bankTransfer.aggregate({
      where: { status: "EFFECTED", cashSessionId: session.id },
      _sum: { amount: true },
    }),
    prisma.cashCorrection.aggregate({
      where: { cashSessionId: session.id },
      _sum: { amount: true },
    }),
  ]);

  const cashIn = cashInAgg._sum.amount ?? 0;
  const cashOut = cashOutAgg._sum.amount ?? 0;
  const transfersOut = transfersOutAgg._sum.amount ?? 0;
  const corrections = correctionsAgg._sum.amount ?? 0;

  return {
    openingBalance: session.openingBalance,
    cashIn,
    cashOut,
    transfersOut,
    corrections,
    theoreticalBalance: session.openingBalance + cashIn - cashOut - transfersOut + corrections,
  };
}

export type CashActivityEntry = {
  id: string;
  type: "PAYMENT_CASH" | "EXPENSE_CASH" | "BANK_TRANSFER" | "CORRECTION";
  date: Date;
  amount: number;
  label: string;
  reference: string | null;
};

/**
 * Flux chronologique "Activité récente" (section 9) — construit à partir
 * des données existantes (`Payment`, `Expense`, `BankTransfer`,
 * `CashCorrection`), jamais d'un `CashMovement`. `amount` est toujours
 * signé ici (positif = entrée, négatif = sortie) pour un affichage direct.
 */
/** Phase 3C / Lot C1 — même filtre `establishmentId` que getCashSessionBreakdown ci-dessus, même raison. */
export async function getCashSessionActivity(
  session: Pick<CashSession, "id" | "openedAt" | "closedAt" | "establishmentId">,
  limit = 50,
): Promise<CashActivityEntry[]> {
  await verifySession();
  const windowEnd = session.closedAt ?? new Date();
  const establishmentFilter = session.establishmentId ? { establishmentId: session.establishmentId } : {};

  const [payments, expenses, transfers, corrections] = await Promise.all([
    prisma.payment.findMany({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { id: true, amount: true, paidAt: true, reference: true },
    }),
    prisma.expense.findMany({
      where: { method: "CASH", paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { id: true, amount: true, paidAt: true, reference: true, categoryNameSnapshot: true },
    }),
    prisma.bankTransfer.findMany({
      where: { status: "EFFECTED", cashSessionId: session.id },
      select: { id: true, amount: true, effectedAt: true, reference: true, bankAccount: { select: { label: true } } },
    }),
    prisma.cashCorrection.findMany({
      where: { cashSessionId: session.id },
      select: { id: true, amount: true, createdAt: true, reason: true },
    }),
  ]);

  const entries: CashActivityEntry[] = [
    ...payments.map((p) => ({
      id: p.id,
      type: "PAYMENT_CASH" as const,
      date: p.paidAt,
      amount: p.amount,
      label: "Paiement reçu (CASH)",
      reference: p.reference,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "EXPENSE_CASH" as const,
      date: e.paidAt,
      amount: -e.amount,
      label: `Dépense — ${e.categoryNameSnapshot}`,
      reference: e.reference,
    })),
    ...transfers.map((t) => ({
      id: t.id,
      type: "BANK_TRANSFER" as const,
      date: t.effectedAt!,
      amount: -t.amount,
      label: `Versement vers ${t.bankAccount.label}`,
      reference: t.reference,
    })),
    ...corrections.map((c) => ({
      id: c.id,
      type: "CORRECTION" as const,
      date: c.createdAt,
      amount: c.amount,
      label: `Correction — ${c.reason}`,
      reference: null,
    })),
  ];

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}
