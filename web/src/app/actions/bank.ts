"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, type TransferFrequency } from "@/generated/prisma/client";
import { getCurrentUser, verifySession, requireActiveEstablishment } from "@/lib/dal";
import { resolveDefaultCashRegister, computeTheoreticalBalance } from "@/lib/cash-data";
import { catchUpSchedule, isSerializationConflict, isBankTransferScheduleDateUniqueViolation } from "@/lib/transfer-schedule-engine";
import { resolveAnchorDayOnCreate, resolveAnchorDayOnUpdate } from "@/lib/transfer-frequency";
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : aucune fonction
  // de ce fichier n'était gardée par requireActiveEstablishment(), alors que
  // tariffs.ts/expenses.ts le sont déjà pour des actions de même nature.
  // Placée avant le contrôle de rôle ADMIN, même ordre que createTariff().
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer un compte bancaire." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut créer un compte bancaire." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer un compte bancaire." };
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
        establishmentId: user.establishmentId,
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
        establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que createBankAccount() ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce compte bancaire." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut modifier un compte bancaire." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce compte bancaire." };
  }

  const parsed = BankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Phase 3D / Lot D6 — un compte d'un autre établissement est
      // désormais indistinguable d'un id inexistant.
      const existing = await tx.bankAccount.findFirst({ where: { id, establishmentId: user.establishmentId } });
      if (!existing) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      const result = await tx.bankAccount.updateMany({
        where: { id, establishmentId: user.establishmentId },
        data: {
          label: parsed.data.label,
          bankName: parsed.data.bankName,
          maskedAccountNumber: parsed.data.maskedAccountNumber ?? null,
        },
      });
      if (result.count === 0) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
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
          establishmentId: user.establishmentId,
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

// Phase 3G / Lot D12-P42 — faille signalée en D12-P41 : désactiver un compte
// ne prévenait jamais l'administrateur que des programmations actives le
// référençaient encore (elles continuent d'avancer silencieusement leur
// échéance sans jamais générer de virement tant que le compte reste
// désactivé, voir catchUpSchedule). Message singulier/pluriel distinct,
// jamais de pluriel français incorrect à 1.
function formatActiveScheduleWarning(count: number): string {
  if (count === 1) {
    return "Compte bancaire désactivé. Attention : 1 programmation de virements est toujours active et ne générera plus de virements tant que ce compte restera désactivé.";
  }
  return `Compte bancaire désactivé. Attention : ${count} programmations de virements sont toujours actives et ne généreront plus de virements tant que ce compte restera désactivé.`;
}

/** Désactivation uniquement — jamais de suppression physique (BLOC 7 : "pas de suppression destructive si le compte possède un historique"). Idempotent si déjà inactif (pas de faux AuditLog). */
export async function deactivateBankAccount(id: string): Promise<{ error?: string; warning?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment(), même
  // principe que toggleActive()/toggleTariffActive() (direction
  // désactivation) — désactiver un compte réduit l'exposition de
  // l'établissement, jamais ne l'augmente.
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut désactiver un compte bancaire." };
  }
  // Phase 3B / Lot B2 — résolu côté serveur depuis la session.
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de désactiver ce compte bancaire." };
  }

  let activeScheduleCount = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankAccount.findFirst({ where: { id, establishmentId: user.establishmentId } });
      if (!existing) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      if (!existing.active) {
        return;
      }
      // Phase 3G / Lot D12-P42 — compté après confirmation d'appartenance à
      // l'établissement, filtré par `bankAccountId` ET `establishmentId`.
      // Lecture seule, dans la même transaction que la désactivation, sans
      // isolation Serializable supplémentaire (aucune invariante numérique à
      // protéger ici, juste une information d'affichage) : une programmation
      // créée ou réactivée entre ce comptage et la validation de cette
      // transaction ne serait pas reflétée — le nombre retourné est l'état
      // observé au moment du contrôle, jamais présenté comme une garantie
      // durable.
      activeScheduleCount = await tx.transferSchedule.count({
        where: { bankAccountId: id, establishmentId: user.establishmentId, active: true },
      });
      const result = await tx.bankAccount.updateMany({
        where: { id, establishmentId: user.establishmentId },
        data: { active: false },
      });
      if (result.count === 0) {
        throw new BankActionError("Compte bancaire introuvable.");
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "BANK_ACCOUNT_DEACTIVATED",
          entityType: "BankAccount",
          entityId: id,
          reason: null,
          oldValue: { active: true },
          newValue: { active: false },
          establishmentId: user.establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof BankActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }

  if (activeScheduleCount > 0) {
    return { warning: formatActiveScheduleWarning(activeScheduleCount) };
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : createBankTransfer()
  // crée un nouvel engagement financier, même raison que createBankAccount()
  // ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer un virement." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer un virement." };
  }

  if (input.status !== "DRAFT" && input.status !== "SCHEDULED") {
    return { error: "Statut initial invalide." };
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { error: "Le montant doit être un nombre entier strictement positif." };
  }

  try {
    const transfer = await prisma.$transaction(
      async (tx) => {
        // Phase 3D / Lot D8 — le compte bancaire cible doit appartenir au
        // même établissement ; aucun virement n'est créé s'il est absent ou
        // appartient à un autre établissement (même message, indistinguable).
        const account = await tx.bankAccount.findFirst({
          where: { id: input.bankAccountId, establishmentId: user.establishmentId },
        });
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
            establishmentId: user.establishmentId,
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
            establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : effectuer un
  // virement déplace réellement de la trésorerie (DRAFT/SCHEDULED →
  // EFFECTED) — action financière réelle, jamais risk-reducing, donc gardée
  // comme une création, contrairement à cancelBankTransfer() ci-dessous.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de confirmer ce virement." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de confirmer ce virement." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3D / Lot D6 (priorité critique) — le virement doit
        // appartenir à l'établissement courant. Un virement extérieur est
        // désormais indistinguable d'un virement inexistant : il ne peut ni
        // être marqué EFFECTED, ni affecter la trésorerie de cet établissement.
        const transfer = await tx.bankTransfer.findFirst({ where: { id, establishmentId: user.establishmentId } });
        if (!transfer) {
          throw new BankActionError("Virement introuvable.");
        }
        if (transfer.status === "EFFECTED") {
          throw new BankActionError("Ce virement a déjà été effectué.");
        }
        if (transfer.status === "CANCELLED") {
          throw new BankActionError("Ce virement a été annulé et ne peut plus être effectué.");
        }

        // Le compte bancaire associé (seul compte référencé par ce modèle —
        // la "source" est la caisse elle-même, pas une seconde BankAccount)
        // doit lui aussi appartenir au même établissement : un virement
        // historique mal rattaché ne doit jamais être réputé valide sur la
        // seule foi de son propre `establishmentId`.
        const account = await tx.bankAccount.findFirst({
          where: { id: transfer.bankAccountId, establishmentId: user.establishmentId },
        });
        if (!account || !account.active) {
          throw new BankActionError("Ce compte bancaire est désactivé.");
        }

        // Phase 3D / Lot D6 — la session de caisse utilisée pour le calcul
        // de disponibilité doit elle aussi appartenir à cet établissement :
        // sans ce filtre, computeTheoreticalBalance() recevrait une session
        // dont le solde pourrait ne pas refléter la bonne trésorerie.
        const register = await resolveDefaultCashRegister(tx, user.establishmentId);
        const session = await tx.cashSession.findFirst({
          where: { cashRegisterId: register.id, status: "OPEN", establishmentId: user.establishmentId },
        });
        if (!session) {
          throw new BankActionError("Aucune session de caisse ouverte — impossible de confirmer ce virement.");
        }

        // Règle financière inchangée — même calcul, même seuil, aucune
        // nouvelle logique comptable inventée.
        const available = await computeTheoreticalBalance(tx, session);
        if (transfer.amount > available) {
          throw new BankActionError(
            `Le montant dépasse la trésorerie théorique disponible (${available.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA).`,
          );
        }

        const effectedAt = new Date();
        // Phase 3D / Lot D6 — écriture finale filtrée par établissement en
        // plus de l'id, jamais seulement la vérification faite ci-dessus.
        const result = await tx.bankTransfer.updateMany({
          where: { id, establishmentId: user.establishmentId },
          data: { status: "EFFECTED", effectedAt, effectedByUserId: user.id, cashSessionId: session.id },
        });
        if (result.count === 0) {
          throw new BankActionError("Virement introuvable.");
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BANK_TRANSFER_EFFECTED",
            entityType: "BankTransfer",
            entityId: id,
            reason: null,
            oldValue: { status: transfer.status },
            newValue: { status: "EFFECTED", cashSessionId: session.id, amount: transfer.amount },
            establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — décision explicite : volontairement JAMAIS
  // gardée par requireActiveEstablishment(), même principe que
  // cancelReservation()/cancelRental() — annuler un virement non encore
  // effectué réduit l'exposition de l'établissement (ne s'applique d'ailleurs
  // jamais à un virement déjà EFFECTED, voir le contrôle ci-dessous).
  const user = await getCurrentUser();
  // Phase 3B / Lot B2 — résolu côté serveur depuis la session.
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'annuler ce virement." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const transfer = await tx.bankTransfer.findFirst({ where: { id, establishmentId: user.establishmentId } });
        if (!transfer) {
          throw new BankActionError("Virement introuvable.");
        }
        if (transfer.status === "EFFECTED") {
          throw new BankActionError("Un virement déjà effectué ne peut pas être annulé.");
        }
        if (transfer.status === "CANCELLED") {
          return;
        }
        const result = await tx.bankTransfer.updateMany({
          where: { id, establishmentId: user.establishmentId },
          data: { status: "CANCELLED" },
        });
        if (result.count === 0) {
          throw new BankActionError("Virement introuvable.");
        }
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BANK_TRANSFER_CANCELLED",
            entityType: "BankTransfer",
            entityId: id,
            reason: null,
            oldValue: { status: transfer.status },
            newValue: { status: "CANCELLED" },
            establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que createBankAccount() ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de configurer une programmation." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut configurer une programmation de versement." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de configurer une programmation." };
  }

  const parsed = TransferScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    const schedule = await prisma.$transaction(async (tx) => {
      // Phase 3D / Lot D8 — le compte bancaire cible doit appartenir au
      // même établissement avant de créer la programmation.
      const account = await tx.bankAccount.findFirst({
        where: { id: parsed.data.bankAccountId, establishmentId: user.establishmentId },
      });
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
          anchorDay: resolveAnchorDayOnCreate(parsed.data.nextRunAt),
          createdByUserId: user.id,
          establishmentId: user.establishmentId,
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
          establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que createBankAccount() ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette programmation." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut modifier une programmation de versement." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette programmation." };
  }

  const parsed = TransferScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Phase 3D / Lot D6 — la programmation ciblée ET le nouveau compte
      // bancaire qu'on lui assigne doivent tous deux appartenir au même
      // établissement : sans ce second filtre, une programmation pourrait
      // être redirigée vers le compte d'un autre établissement.
      const existing = await tx.transferSchedule.findFirst({
        where: { id, establishmentId: user.establishmentId },
      });
      if (!existing) {
        throw new BankActionError("Programmation introuvable.");
      }
      const account = await tx.bankAccount.findFirst({
        where: { id: parsed.data.bankAccountId, establishmentId: user.establishmentId },
      });
      if (!account || !account.active) {
        throw new BankActionError("Ce compte bancaire est désactivé.");
      }

      const result = await tx.transferSchedule.updateMany({
        where: { id, establishmentId: user.establishmentId },
        data: {
          bankAccountId: parsed.data.bankAccountId,
          frequency: parsed.data.frequency,
          amountType: parsed.data.amountType,
          fixedAmount: parsed.data.fixedAmount ?? null,
          percentage: parsed.data.percentage ?? null,
          nextRunAt: parsed.data.nextRunAt,
          // Ne déplace l'ancre que si `nextRunAt` a réellement changé — une
          // simple modification du montant/pourcentage/fréquence renvoie la
          // même date depuis le formulaire et ne doit jamais la recalculer
          // à partir d'une valeur potentiellement déjà clampée.
          anchorDay: resolveAnchorDayOnUpdate(existing.nextRunAt, existing.anchorDay, parsed.data.nextRunAt),
        },
      });
      if (result.count === 0) {
        throw new BankActionError("Programmation introuvable.");
      }

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
          establishmentId: user.establishmentId,
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
  // Phase 3G / Lot D12-P110 — décision explicite, même principe que
  // deactivateBankAccount() ci-dessus : volontairement JAMAIS gardée par
  // requireActiveEstablishment().
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut désactiver une programmation de versement." };
  }
  // Phase 3B / Lot B2 — résolu côté serveur depuis la session.
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de désactiver cette programmation." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.transferSchedule.findFirst({
        where: { id, establishmentId: user.establishmentId },
      });
      if (!existing) {
        throw new BankActionError("Programmation introuvable.");
      }
      if (!existing.active) {
        return;
      }
      const result = await tx.transferSchedule.updateMany({
        where: { id, establishmentId: user.establishmentId },
        data: { active: false },
      });
      if (result.count === 0) {
        throw new BankActionError("Programmation introuvable.");
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRANSFER_SCHEDULE_DEACTIVATED",
          entityType: "TransferSchedule",
          entityId: id,
          reason: null,
          oldValue: { active: true },
          newValue: { active: false },
          establishmentId: user.establishmentId,
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

/**
 * BLOC 18/19, corrigé — à appeler depuis n'importe quelle page pertinente.
 * Pour chaque programmation active échue, rattrape TOUTES ses échéances
 * manquantes (pas une seule par appel — voir `catchUpSchedule`,
 * src/lib/transfer-schedule-engine.ts, qui porte la boucle bornée et la
 * logique métier complète : FIXED/PERCENTAGE, compte désactivé, montant
 * nul, toujours `status: SCHEDULED` jamais EFFECTED). Cette fonction ne
 * fait plus que lister les programmations dues et déléguer, programmation
 * par programmation, à `catchUpSchedule`.
 *
 * Traçabilité (BLOC 20) : `transferScheduleId` + `createdByUserId` (celui
 * de la programmation, pas un utilisateur système inventé) suffisent —
 * aucune entrée AuditLog pour la simple génération, qui n'est l'action
 * d'aucun humain.
 *
 * Chaque échéance reste traitée dans sa propre transaction Serializable
 * courte avec relecture de `nextRunAt`/`active` à l'intérieur de la
 * transaction : deux déclenchements concurrents ne peuvent pas générer
 * deux fois le même virement pour la même échéance (voir
 * `catchUpSchedule`/`isSerializationConflict`).
 */
export async function generateDueScheduledTransfers(): Promise<{ generated: number }> {
  // Lecture paresseuse déclenchée par la simple consultation d'une page —
  // aucune restriction de rôle au-delà d'être authentifié (même garde que
  // toute autre lecture de ce projet), voir BLOC 20 : aucun utilisateur
  // système inventé, la génération n'est l'action d'aucun humain précis.
  // Phase 3G / Lot D12-P33 — faille confirmée en D12-P32 : la sélection des
  // programmations échues n'était pas filtrée par établissement, permettant
  // à l'utilisateur déclencheur de provoquer, par la simple consultation
  // d'une page, des écritures réelles (BankTransfer créés, nextRunAt avancé)
  // sur des programmations appartenant à d'autres établissements. Confiné
  // désormais à l'établissement de l'utilisateur déclencheur, sans changer
  // le comportement pour les programmations qui lui appartiennent déjà.
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : cette
  // génération automatique crée de vrais `BankTransfer` (status SCHEDULED) et
  // avance `nextRunAt` — un établissement suspendu ou à l'abonnement expiré
  // ne doit pas continuer à produire silencieusement de nouvelles écritures
  // financières à chaque consultation de page. Retour silencieux à `{generated:
  // 0}` (même convention que le cas `NO_ESTABLISHMENT` déjà existant
  // ci-dessous) plutôt qu'une erreur : cette fonction n'est jamais appelée
  // directement par un formulaire, donc aucun message utilisateur à afficher.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    return { generated: 0 };
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { generated: 0 };
  }
  const now = new Date();

  const dueSchedules = await prisma.transferSchedule.findMany({
    where: { active: true, nextRunAt: { lte: now }, establishmentId: user.establishmentId },
    select: { id: true },
  });

  let generated = 0;

  for (const { id: scheduleId } of dueSchedules) {
    const result = await catchUpSchedule(scheduleId, now);
    generated += result.generated;
    if (result.stoppedOnError && !isSerializationConflict(result.stoppedOnError)) {
      // Un conflit de sérialisation est un aléa de concurrence attendu,
      // retraité au prochain appel — jamais masqué pour autant côté
      // observabilité, mais pas davantage qu'avant (déjà silencieux).
      // Toute AUTRE erreur est, elle, inattendue : journalisée plutôt que
      // masquée, sans bloquer le traitement des programmations suivantes.
      // Phase 3G / Lot D12-P36 — une violation de la contrainte
      // `BankTransfer_schedule_date_unique` (code Prisma P2002) tombe ici,
      // jamais dans la branche "conflit de sérialisation" ci-dessus :
      // signalée explicitement dans les journaux, `generated` n'est jamais
      // incrémenté pour cette itération (voir catchUpSchedule), donc aucun
      // faux succès n'est jamais retourné à l'appelant.
      //
      // Phase 3G / Lot D12-P39 — confirmée empiriquement (test de
      // concurrence réel, D12-P37) comme une variante bénigne de
      // concurrence perdue, distinguée ici du cas générique pour ne pas
      // l'alarmer de la même façon qu'une erreur réellement inattendue.
      // `generated` reste inchangé, aucune relecture de `nextRunAt`
      // ajoutée, aucune reprise automatique.
      if (isBankTransferScheduleDateUniqueViolation(result.stoppedOnError)) {
        console.error(
          `generateDueScheduledTransfers() — programmation ${scheduleId} : tentative concurrente a rencontré la contrainte anti-doublon (BankTransfer_schedule_date_unique) — échéance déjà traitée par une autre exécution, aucune action nécessaire.`,
        );
      } else {
        console.error(
          `generateDueScheduledTransfers() — échec inattendu pour la programmation ${scheduleId} :`,
          result.stoppedOnError,
        );
      }
    }
  }

  return { generated };
}
