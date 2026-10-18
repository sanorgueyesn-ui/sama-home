import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import type { BankTransferStatus } from "@/generated/prisma/client";

// Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement de
// l'appelant sur chacune des 4 fonctions de ce fichier ; aucune donnée
// globale par défaut pour un compte sans établissement.
export async function listBankAccounts() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.bankAccount.findMany({
    where: { establishmentId: user.establishmentId },
    orderBy: [{ active: "desc" }, { label: "asc" }],
  });
}

/** Comptes actifs uniquement — pour proposer une destination à un nouveau virement. */
export async function listActiveBankAccounts() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.bankAccount.findMany({
    where: { active: true, establishmentId: user.establishmentId },
    orderBy: { label: "asc" },
  });
}

export async function listBankTransfers(filters: { status?: BankTransferStatus; bankAccountId?: string } = {}) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.bankTransfer.findMany({
    where: {
      establishmentId: user.establishmentId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listTransferSchedules() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.transferSchedule.findMany({
    where: { establishmentId: user.establishmentId },
    orderBy: [{ active: "desc" }, { nextRunAt: "asc" }],
  });
}
