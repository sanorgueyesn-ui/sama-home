import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { CashSession } from "@/generated/prisma/client";

export interface CashSessionBreakdownResult {
  openingBalance: number;
  
  // Totaux consolidés (ERP connecté dépenses & encaissements)
  totalIn: number;
  totalOut: number;
  transfersOut: number;
  corrections: number;
  theoreticalBalance: number;

  // Détail par méthode
  cashIn: number;
  cashOut: number;
  cashNet: number;
  physicalCashBalance: number; // Solde pour comptage physique tiroir

  waveIn: number;
  waveOut: number;
  waveNet: number;

  omIn: number;
  omOut: number;
  omNet: number;

  otherIn: number;
  otherOut: number;
}

/**
 * Calcul dynamique du solde de caisse et de sa décomposition.
 * Relie directement TOUS les encaissements (Espèces, Wave, Orange Money)
 * et TOUTES les dépenses (Espèces, Wave, Orange Money) de l'établissement
 * pendant la session active.
 */
export async function getCashSessionBreakdown(
  session: Pick<CashSession, "id" | "openingBalance" | "openedAt" | "closedAt" | "establishmentId">,
): Promise<CashSessionBreakdownResult> {
  await verifySession();
  const windowEnd = session.closedAt ?? new Date();
  const establishmentFilter = session.establishmentId ? { establishmentId: session.establishmentId } : {};

  const [payments, expenses, transfersOutAgg, correctionsAgg] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { amount: true, method: true },
    }),
    prisma.expense.findMany({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { amount: true, method: true },
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

  let cashIn = 0;
  let waveIn = 0;
  let omIn = 0;
  let otherIn = 0;
  for (const p of payments) {
    if (p.method === "CASH") cashIn += p.amount;
    else if (p.method === "WAVE") waveIn += p.amount;
    else if (p.method === "ORANGE_MONEY") omIn += p.amount;
    else otherIn += p.amount;
  }

  let cashOut = 0;
  let waveOut = 0;
  let omOut = 0;
  let otherOut = 0;
  for (const e of expenses) {
    if (e.method === "CASH") cashOut += e.amount;
    else if (e.method === "WAVE") waveOut += e.amount;
    else if (e.method === "ORANGE_MONEY") omOut += e.amount;
    else otherOut += e.amount;
  }

  const totalIn = cashIn + waveIn + omIn + otherIn;
  const totalOut = cashOut + waveOut + omOut + otherOut;
  const transfersOut = transfersOutAgg._sum.amount ?? 0;
  const corrections = correctionsAgg._sum.amount ?? 0;

  // Solde théorique global consolidé
  const theoreticalBalance = session.openingBalance + totalIn - totalOut - transfersOut + corrections;

  // Solde physique spécifique espèces (pour tiroir caisse)
  const physicalCashBalance = session.openingBalance + cashIn - cashOut - transfersOut + corrections;

  return {
    openingBalance: session.openingBalance,
    totalIn,
    totalOut,
    transfersOut,
    corrections,
    theoreticalBalance,

    cashIn,
    cashOut,
    cashNet: cashIn - cashOut,
    physicalCashBalance,

    waveIn,
    waveOut,
    waveNet: waveIn - waveOut,

    omIn,
    omOut,
    omNet: omIn - omOut,

    otherIn,
    otherOut,
  };
}

export type CashActivityEntry = {
  id: string;
  type: "PAYMENT" | "EXPENSE" | "BANK_TRANSFER" | "CORRECTION";
  method?: "CASH" | "WAVE" | "ORANGE_MONEY" | "OTHER";
  date: Date;
  amount: number;
  label: string;
  reference: string | null;
  note?: string | null;
};

/**
 * Flux chronologique complet de la caisse :
 * Enregistre et affiche en temps réel TOUS les encaissements,
 * TOUTES les dépenses, les versements et les corrections.
 */
export async function getCashSessionActivity(
  session: Pick<CashSession, "id" | "openedAt" | "closedAt" | "establishmentId">,
  limit = 50,
): Promise<CashActivityEntry[]> {
  await verifySession();
  const windowEnd = session.closedAt ?? new Date();
  const establishmentFilter = session.establishmentId ? { establishmentId: session.establishmentId } : {};

  const [payments, expenses, transfers, corrections] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { id: true, amount: true, paidAt: true, reference: true, method: true, note: true },
    }),
    prisma.expense.findMany({
      where: { paidAt: { gte: session.openedAt, lt: windowEnd }, ...establishmentFilter },
      select: { id: true, amount: true, paidAt: true, reference: true, categoryNameSnapshot: true, method: true, note: true },
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

  const methodLabel = (m: string) => {
    switch (m) {
      case "CASH":
        return "Espèces";
      case "WAVE":
        return "Wave";
      case "ORANGE_MONEY":
        return "Orange Money";
      default:
        return "Autre";
    }
  };

  const entries: CashActivityEntry[] = [
    ...payments.map((p) => ({
      id: p.id,
      type: "PAYMENT" as const,
      method: p.method as any,
      date: p.paidAt,
      amount: p.amount,
      label: `Encaissement reçu (${methodLabel(p.method)})`,
      reference: p.reference,
      note: p.note,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "EXPENSE" as const,
      method: e.method as any,
      date: e.paidAt,
      amount: -e.amount,
      label: `Dépense — ${e.categoryNameSnapshot} (${methodLabel(e.method)})`,
      reference: e.reference,
      note: e.note,
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
      label: `Ajustement caisse — ${c.reason}`,
      reference: null,
    })),
  ];

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}
