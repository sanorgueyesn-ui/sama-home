import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { BankTransferStatus } from "@/generated/prisma/client";

export async function listBankAccounts() {
  await verifySession();
  return prisma.bankAccount.findMany({ orderBy: [{ active: "desc" }, { label: "asc" }] });
}

/** Comptes actifs uniquement — pour proposer une destination à un nouveau virement. */
export async function listActiveBankAccounts() {
  await verifySession();
  return prisma.bankAccount.findMany({ where: { active: true }, orderBy: { label: "asc" } });
}

export async function listBankTransfers(filters: { status?: BankTransferStatus; bankAccountId?: string } = {}) {
  await verifySession();
  return prisma.bankTransfer.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.bankAccountId ? { bankAccountId: filters.bankAccountId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listTransferSchedules() {
  await verifySession();
  return prisma.transferSchedule.findMany({ orderBy: [{ active: "desc" }, { nextRunAt: "asc" }] });
}
