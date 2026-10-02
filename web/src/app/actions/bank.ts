"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, type TransferFrequency } from "@/generated/prisma/client";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { resolveDefaultCashRegister, computeTheoreticalBalance } from "@/lib/cash-data";
import { BankAccountSchema, TransferScheduleSchema } from "@/lib/definitions";

/**
 * Bloc 17.2, Étape D — services métier Banque. Un `BankTransfer` n'est
 * JAMAIS écrit dans `Expense` (table structurellement séparée, voir
 * schema.prisma) et un virement `SCHEDULED` n'est jamais déduit de la
 * caisse — seul `computeTheoreticalBalance` (src/lib/cash-data.ts) compte
 * les virements `EFFECTED`, jamais les autres statuts.
 */

class BankActionError extends Error {}

// ---------------------------------------------------------------------------
// Comptes bancaires — ADMIN uniquement (Bloc 17.2 section 3.2)
// ---------------------------------------------------------------------------

export async function createBankAccount(input: {
  label: string;
  bankName: string;
  maskedAccountNumber?: string;
}): Promise<{ error?: string; errors?: Record<string, string[]>; id?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut créer un compte bancaire." };
  }

  const parsed = BankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.bankAccount.create({
      data: {
        label: parsed.data.label,
        bankName: parsed.data.bankName,
        maskedAccountNumber: parsed.data.maskedAccountNumber ?? null,
        createdByUserId: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "BANK_ACCOUNT_CREATED",
        entityType: "BankAccount",
        entityId: created.id,
        reason: null,
        oldValue: Prisma.DbNull,
        newValue: { label: created.label, bankName: created.bankName, active: true },
      },
    });
    return created;
  });

  return { id: account.id };
}

export async function updateBankAccount(
  id: string,
  input: { label: string; bankName: string; maskedAccountNumber?: string },
): Promise<{ error?: string; errors?: Record<string, string[]> }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut modifier un compte bancaire." };
  }

  const parsed = BankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankAccount.findUnique({ where: { id } });
      if (!existing) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      await tx.bankAccount.update({
        where: { id },
        data: {
          label: parsed.data.label,
          bankName: parsed.data.bankName,
          maskedAccountNumber: parsed.data.maskedAccountNumber ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "BANK_ACCOUNT_UPDATED",
          entityType: "BankAccount",
          entityId: id,
          reason: null,
          oldValue: {
            label: existing.label,
            bankName: existing.bankName,
            maskedAccountNumber: existing.maskedAccountNumber,
          },
          newValue: {
            label: parsed.data.label,
            bankName: parsed.data.bankName,
            maskedAccountNumber: parsed.data.maskedAccountNumber ?? null,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  return {};
}

/** Désactivation uniquement — jamais de suppression physique (BLOC 7 : "pas de suppression destructive si le compte possède un historique"). Idempotent si déjà inactif (pas de faux AuditLog). */
export async function deactivateBankAccount(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut désactiver un compte bancaire." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankAccount.findUnique({ where: { id } });
      if (!existing) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      if (!existing.active) {
        return;
      }
      await tx.bankAccount.update({ where: { id }, data: { active: false } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "BANK_ACCOUNT_DEACTIVATED",
          entityType: "BankAccount",
          entityId: id,
          reason: null,
          oldValue: { active: true },
          newValue: { active: false },
        },
      });
    });
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Virements — ADMIN + GESTIONNAIRE (Bloc 17.2 section 3.2)
// ---------------------------------------------------------------------------

/** BLOC 9 — créé en DRAFT ou directement SCHEDULED selon l'appelant ; jamais EFFECTED à la création (ce statut n'est atteint que par `effectBankTransfer`). */
export async function createBankTransfer(input: {
  bankAccountId: string;
  amount: number;
  status: "DRAFT" | "SCHEDULED";
  scheduledAt?: Date;
  reference?: string;
  note?: string;
}): Promise<{ error?: string; id?: string }> {
  const user = await getCurrentUser();

  if (input.status !== "DRAFT" && input.status !== "SCHEDULED") {
    return { error: "Statut initial invalide." };
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { error: "Le montant doit être un nombre entier strictement positif." };
  }

  try {
    const transfer = await prisma.$transaction(
      async (tx) => {
        const account = await tx.bankAccount.findUnique({ where: { id: input.bankAccountId } });
        if (!account) {
          throw new BankActionError("Compte bancaire introuvable.");
        }
        if (!account.active) {
          throw new BankActionError("Ce compte bancaire est désactivé.");
        }

        const created = await tx.bankTransfer.create({
          data: {
            bankAccountId: input.bankAccountId,
            amount: input.amount,
            status: input.status,
            scheduledAt: input.scheduledAt ?? null,
            reference: input.reference?.trim() || null,
            note: input.note?.trim() || null,
            createdByUserId: user.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BANK_TRANSFER_CREATED",
            entityType: "BankTransfer",
            entityId: created.id,
            reason: null,
            oldValue: Prisma.DbNull,
            newValue: { bankAccountId: input.bankAccountId, amount: input.amount, status: input.status },
          },
        });

        return created;
      },
      { isolationLevel: "Serializable" },
    );
    return { id: transfer.id };
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }
}

/**
 * BLOC 16 — DRAFT/SCHEDULED → EFFECTED. Vérifie : virement existant, pas
 * déjà EFFECTED/CANCELLED, compte actif, session de caisse OPEN, montant
 * disponible suffisant (jamais de solde négatif) — tout dans UNE seule
 * transaction Serializable pour qu'un double-effet concurrent échoue
 * plutôt que de déduire deux fois.
 */
export async function effectBankTransfer(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();

  try {
    await prisma.$transaction(
      async (tx) => {
        const transfer = await tx.bankTransfer.findUnique({ where: { id } });
        if (!transfer) {
          throw new BankActionError("Virement introuvable.");
        }
        if (transfer.status === "EFFECTED") {
          throw new BankActionError("Ce virement a déjà été effectué.");
        }
        if (transfer.status === "CANCELLED") {
          throw new BankActionError("Ce virement a été annulé et ne peut plus être effectué.");
        }

        const account = await tx.bankAccount.findUnique({ where: { id: transfer.bankAccountId } });
        if (!account || !account.active) {
          throw new BankActionError("Ce compte bancaire est désactivé.");
        }

        const register = await resolveDefaultCashRegister(tx);
        const session = await tx.cashSession.findFirst({
          where: { cashRegisterId: register.id, status: "OPEN" },
        });
        if (!session) {
          throw new BankActionError("Aucune session de caisse ouverte — impossible de confirmer ce virement.");
        }

        const available = await computeTheoreticalBalance(tx, session);
        if (transfer.amount > available) {
          throw new BankActionError(
            `Le montant dépasse la trésorerie théorique disponible (${available.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA).`,
          );
        }

        const effectedAt = new Date();
        await tx.bankTransfer.update({
          where: { id },
          data: { status: "EFFECTED", effectedAt, effectedByUserId: user.id, cashSessionId: session.id },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BANK_TRANSFER_EFFECTED",
            entityType: "BankTransfer",
            entityId: id,
            reason: null,
            oldValue: { status: transfer.status },
            newValue: { status: "EFFECTED", cashSessionId: session.id, amount: transfer.amount },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Le solde ou le statut a peut-être changé entre-temps (opération concurrente). Veuillez réessayer." };
  }

  return {};
}

/** BLOC 17 — DRAFT/SCHEDULED uniquement ; EFFECTED jamais annulable (correction via CashCorrection si nécessaire, jamais une annulation destructive). Idempotent si déjà CANCELLED. Transaction Serializable (Bloc I.1) : un effectBankTransfer() concurrent gagnant la course fait échouer cette transaction plutôt que d'écraser silencieusement un virement déjà EFFECTED. */
export async function cancelBankTransfer(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();

  try {
    await prisma.$transaction(
      async (tx) => {
        const transfer = await tx.bankTransfer.findUnique({ where: { id } });
        if (!transfer) {
          throw new BankActionError("Virement introuvable.");
        }
        if (transfer.status === "EFFECTED") {
          throw new BankActionError("Un virement déjà effectué ne peut pas être annulé.");
        }
        if (transfer.status === "CANCELLED") {
          return;
        }
        await tx.bankTransfer.update({ where: { id }, data: { status: "CANCELLED" } });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BANK_TRANSFER_CANCELLED",
            entityType: "BankTransfer",
            entityId: id,
            reason: null,
            oldValue: { status: transfer.status },
            newValue: { status: "CANCELLED" },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Le statut a peut-être changé entre-temps (opération concurrente). Veuillez réessayer." };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Programmations — ADMIN uniquement (Bloc 17.2 section 3.2 : "ADMIN seul
// configure les programmations")
// ---------------------------------------------------------------------------

export async function createTransferSchedule(input: {
  bankAccountId: string;
  frequency: TransferFrequency;
  amountType: "FIXED" | "PERCENTAGE";
  fixedAmount?: number;
  percentage?: number;
  nextRunAt: Date;
}): Promise<{ error?: string; errors?: Record<string, string[]>; id?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut configurer une programmation de versement." };
  }

  const parsed = TransferScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    const schedule = await prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({ where: { id: parsed.data.bankAccountId } });
      if (!account) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      if (!account.active) {
        throw new BankActionError("Ce compte bancaire est désactivé.");
      }

      const created = await tx.transferSchedule.create({
        data: {
          bankAccountId: parsed.data.bankAccountId,
          frequency: parsed.data.frequency,
          amountType: parsed.data.amountType,
          fixedAmount: parsed.data.fixedAmount ?? null,
          percentage: parsed.data.percentage ?? null,
          nextRunAt: parsed.data.nextRunAt,
          createdByUserId: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRANSFER_SCHEDULE_CREATED",
          entityType: "TransferSchedule",
          entityId: created.id,
          reason: null,
          oldValue: Prisma.DbNull,
          newValue: {
            bankAccountId: parsed.data.bankAccountId,
            frequency: parsed.data.frequency,
            amountType: parsed.data.amountType,
            fixedAmount: parsed.data.fixedAmount ?? null,
            percentage: parsed.data.percentage ?? null,
          },
        },
      });

      return created;
    });
    return { id: schedule.id };
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }
}

export async function updateTransferSchedule(
  id: string,
  input: {
    bankAccountId: string;
    frequency: TransferFrequency;
    amountType: "FIXED" | "PERCENTAGE";
    fixedAmount?: number;
    percentage?: number;
    nextRunAt: Date;
  },
): Promise<{ error?: string; errors?: Record<string, string[]> }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut modifier une programmation de versement." };
  }

  const parsed = TransferScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.transferSchedule.findUnique({ where: { id } });
      if (!existing) {
        throw new BankActionError("Programmation introuvable.");
      }
      const account = await tx.bankAccount.findUnique({ where: { id: parsed.data.bankAccountId } });
      if (!account || !account.active) {
        throw new BankActionError("Ce compte bancaire est désactivé.");
      }

      await tx.transferSchedule.update({
        where: { id },
        data: {
          bankAccountId: parsed.data.bankAccountId,
          frequency: parsed.data.frequency,
          amountType: parsed.data.amountType,
          fixedAmount: parsed.data.fixedAmount ?? null,
          percentage: parsed.data.percentage ?? null,
          nextRunAt: parsed.data.nextRunAt,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRANSFER_SCHEDULE_UPDATED",
          entityType: "TransferSchedule",
          entityId: id,
          reason: null,
          oldValue: {
            bankAccountId: existing.bankAccountId,
            frequency: existing.frequency,
            amountType: existing.amountType,
            fixedAmount: existing.fixedAmount,
            percentage: existing.percentage,
            nextRunAt: existing.nextRunAt.toISOString(),
          },
          newValue: {
            bankAccountId: parsed.data.bankAccountId,
            frequency: parsed.data.frequency,
            amountType: parsed.data.amountType,
            fixedAmount: parsed.data.fixedAmount ?? null,
            percentage: parsed.data.percentage ?? null,
            nextRunAt: parsed.data.nextRunAt.toISOString(),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }

  return {};
}

/** Idempotent si déjà inactive. */
export async function deactivateTransferSchedule(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut désactiver une programmation de versement." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.transferSchedule.findUnique({ where: { id } });
      if (!existing) {
        throw new BankActionError("Programmation introuvable.");
      }
      if (!existing.active) {
        return;
      }
      await tx.transferSchedule.update({ where: { id }, data: { active: false } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRANSFER_SCHEDULE_DEACTIVATED",
          entityType: "TransferSchedule",
          entityId: id,
          reason: null,
          oldValue: { active: true },
          newValue: { active: false },
        },
      });
    });
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Génération paresseuse — BLOC 18/19/20
// ---------------------------------------------------------------------------

function advanceNextRunAt(current: Date, frequency: TransferFrequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY": {
      const day = next.getDate();
      const year = next.getFullYear();
      const targetMonthIndex = next.getMonth() + 1;
      const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0).getDate();
      next.setFullYear(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth));
      break;
    }
  }
  return next;
}

/**
 * BLOC 18/19 — à appeler depuis n'importe quelle page pertinente (aucune UI
 * dans ce bloc, donc aucun appelant encore — la fonction existe et est
 * testée indépendamment, prête pour l'Étape I). Pour chaque programmation
 * active échue :
 *   - FIXED → `fixedAmount` tel quel ;
 *   - PERCENTAGE → `floor(soldeThéoriqueDisponible × percentage / 100)`,
 *     plafonné au disponible (Bloc 17.2 section 3.4/BLOC 19 — FCFA entier,
 *     jamais de Float, même convention que tout le reste du projet) ;
 *   - si le montant calculé est <= 0, ou si le compte bancaire est
 *     désactivé : AUCUN virement créé, mais `nextRunAt` avance quand même
 *     (évite une boucle de nouvelle tentative infinie sur une
 *     configuration durablement inopérante) ;
 *   - toujours `status: SCHEDULED`, jamais EFFECTED (BLOC 9/18 — "une
 *     programmation ne doit jamais prétendre avoir effectué
 *     automatiquement un transfert").
 *
 * Traçabilité (BLOC 20) : `transferScheduleId` + `createdByUserId` (celui
 * de la programmation, pas un utilisateur système inventé ni l'utilisateur
 * de passage qui a déclenché la vérification) suffisent — aucune entrée
 * AuditLog pour la simple génération, qui n'est l'action d'aucun humain.
 *
 * Chaque programmation est traitée dans sa propre transaction Serializable
 * (relecture de `nextRunAt`/`active` dans la transaction) : deux
 * déclenchements concurrents de cette fonction ne peuvent pas générer deux
 * fois le même virement pour la même échéance (BLOC 23, test 5).
 */
export async function generateDueScheduledTransfers(): Promise<{ generated: number }> {
  // Lecture paresseuse déclenchée par la simple consultation d'une page —
  // aucune restriction de rôle au-delà d'être authentifié (même garde que
  // toute autre lecture de ce projet), voir BLOC 20 : aucun utilisateur
  // système inventé, la génération n'est l'action d'aucun humain précis.
  await verifySession();
  const now = new Date();

  const dueSchedules = await prisma.transferSchedule.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    select: { id: true },
  });

  let generated = 0;

  for (const { id: scheduleId } of dueSchedules) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const fresh = await tx.transferSchedule.findUnique({ where: { id: scheduleId } });
          if (!fresh || !fresh.active || fresh.nextRunAt > now) {
            return;
          }

          const account = await tx.bankAccount.findUnique({ where: { id: fresh.bankAccountId } });
          if (!account || !account.active) {
            await tx.transferSchedule.update({
              where: { id: fresh.id },
              data: { nextRunAt: advanceNextRunAt(fresh.nextRunAt, fresh.frequency) },
            });
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
            await tx.transferSchedule.update({
              where: { id: fresh.id },
              data: { nextRunAt: advanceNextRunAt(fresh.nextRunAt, fresh.frequency) },
            });
            return;
          }

          await tx.bankTransfer.create({
            data: {
              bankAccountId: fresh.bankAccountId,
              amount,
              status: "SCHEDULED",
              scheduledAt: now,
              createdByUserId: fresh.createdByUserId,
              transferScheduleId: fresh.id,
            },
          });

          await tx.transferSchedule.update({
            where: { id: fresh.id },
            data: { nextRunAt: advanceNextRunAt(fresh.nextRunAt, fresh.frequency) },
          });

          generated++;
        },
        { isolationLevel: "Serializable" },
      );
    } catch {
      // Une programmation en conflit de sérialisation (déclenchement
      // concurrent) ne doit jamais bloquer le traitement des autres
      // programmations dues — elle sera retraitée au prochain déclenchement.
      continue;
    }
  }

  return { generated };
}
