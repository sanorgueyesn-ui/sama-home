"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin, requireActiveEstablishment } from "@/lib/dal";
import { ExpenseCategoryNameSchema } from "@/lib/definitions";

/**
 * Bloc 16.2 — CRUD des catégories de dépenses. ADMIN uniquement, toujours
 * revérifié ici côté serveur via requireAdmin() (jamais un simple masquage
 * UI — même principe que src/app/actions/users.ts, seul autre module de ce
 * projet à utiliser requireAdmin()). Pas encore de page Paramètres pour les
 * consommer (Bloc 16.3) : signatures simples par paramètres (comme
 * toggleTariffActive/deleteTariff dans tariffs.ts), pas de FormData/
 * useActionState — on évite d'inventer une URL de redirection vers une page
 * qui n'existe pas encore.
 */

class ExpenseCategoryActionError extends Error {}

/**
 * Phase 3D / Lot D8 — `establishmentId` désormais obligatoire et toujours
 * transmis par l'appelant (jamais recalculé ici) : la détection de doublon
 * est limitée au même établissement, pour que deux établissements distincts
 * puissent utiliser exactement le même nom de catégorie sans se bloquer
 * mutuellement.
 */
async function findDuplicateName(
  tx: Prisma.TransactionClient,
  name: string,
  establishmentId: string,
  excludeId?: string,
) {
  return tx.expenseCategory.findFirst({
    where: { name, establishmentId, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

/**
 * Section 13/18/21 — nom obligatoire/trim/longueur bornée (Zod), doublons
 * exacts refusés, position = max+1 (0 si aucune catégorie), active=true par
 * défaut. Vérification de doublon + création dans la même transaction
 * Serializable : deux créations concurrentes du même nom ("Cas A") sont
 * exactement le "write skew via phantom read" que PostgreSQL SERIALIZABLE
 * est conçu pour détecter — l'une des deux transactions échoue avec une
 * erreur de sérialisation plutôt que de laisser passer un doublon.
 */
export async function createExpenseCategory(name: string): Promise<{ error?: string; id?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : aucune fonction
  // de ce fichier n'était gardée par requireActiveEstablishment(). Placée
  // avant requireAdmin() (conservé tel quel, redirection inchangée en cas de
  // rôle insuffisant — même mécanisme qu'avant ce lot).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer une catégorie." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer une catégorie." };
  }
  // Liaison locale non nullable — le typage de `admin.establishmentId` ne
  // reste pas restreint à `string` à l'intérieur de la fermeture de la
  // transaction ci-dessous ; cette constante le reste.
  const establishmentId = admin.establishmentId;

  const parsed = ExpenseCategoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  }

  try {
    const category = await prisma.$transaction(
      async (tx) => {
        if (await findDuplicateName(tx, parsed.data, establishmentId)) {
          throw new ExpenseCategoryActionError("Une catégorie porte déjà exactement ce nom.");
        }
        const maxPosition = await tx.expenseCategory.aggregate({
          where: { establishmentId },
          _max: { position: true },
        });
        const position = (maxPosition._max.position ?? -1) + 1;

        const created = await tx.expenseCategory.create({
          data: { name: parsed.data, active: true, position, establishmentId },
        });
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_CREATED",
            entityType: "ExpenseCategory",
            entityId: created.id,
            reason: null,
            oldValue: Prisma.DbNull,
            newValue: { name: created.name, active: created.active, position: created.position },
            establishmentId: admin.establishmentId,
          },
        });
        return created;
      },
      { isolationLevel: "Serializable" },
    );
    revalidatePath("/depenses");
    return { id: category.id };
  } catch (error) {
    if (error instanceof ExpenseCategoryActionError) {
      return { error: error.message };
    }
    return {
      error: "Une catégorie du même nom vient peut-être d'être créée à l'instant. Veuillez réessayer.",
    };
  }
}

/**
 * Section 14 — ADMIN uniquement, catégorie existante, nom valide, pas de
 * doublon exact. Ne touche jamais `Expense.categoryNameSnapshot` (aucune
 * écriture sur `Expense` ici) : une dépense déjà créée continue d'afficher
 * le nom historique figé au moment de sa création, jamais le nom renommé.
 * Renommage vers le nom déjà en place : idempotent, aucun AuditLog inutile
 * (même principe que activate/deactivate ci-dessous).
 */
export async function renameExpenseCategory(id: string, name: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que createExpenseCategory() ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de renommer cette catégorie." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de renommer cette catégorie." };
  }
  const establishmentId = admin.establishmentId;

  const parsed = ExpenseCategoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3D / Lot D7 — une catégorie d'un autre établissement est
        // désormais indistinguable d'un id inexistant.
        const existing = await tx.expenseCategory.findFirst({
          where: { id, establishmentId },
        });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (existing.name === parsed.data) {
          return;
        }
        if (await findDuplicateName(tx, parsed.data, establishmentId, id)) {
          throw new ExpenseCategoryActionError("Une catégorie porte déjà exactement ce nom.");
        }
        const result = await tx.expenseCategory.updateMany({
          where: { id, establishmentId },
          data: { name: parsed.data },
        });
        if (result.count === 0) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_UPDATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: null,
            oldValue: { name: existing.name },
            newValue: { name: parsed.data },
            establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ExpenseCategoryActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  return {};
}

/** Section 15 — déjà active : idempotent, aucun AuditLog créé. */
export async function activateExpenseCategory(id: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : réactiver une
  // catégorie est la direction "risk-increasing" du bascule, gardée au même
  // titre qu'une création (même principe que toggleActive()/
  // toggleTariffActive(), direction réactivation).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'activer cette catégorie." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'activer cette catégorie." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findFirst({
          where: { id, establishmentId: admin.establishmentId },
        });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (existing.active) {
          return;
        }
        const result = await tx.expenseCategory.updateMany({
          where: { id, establishmentId: admin.establishmentId },
          data: { active: true },
        });
        if (result.count === 0) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_ACTIVATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: null,
            oldValue: { active: false },
            newValue: { active: true },
            establishmentId: admin.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ExpenseCategoryActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  return {};
}

/**
 * Section 16 — justification obligatoire. Déjà inactive : pas de faux
 * événement (aucun AuditLog). Ne modifie jamais les dépenses existantes
 * (aucune écriture sur `Expense` ici) — seule `ExpenseCategory.active`
 * change, `categoryId`/`categoryNameSnapshot` des dépenses déjà créées
 * restent intacts.
 */
export async function deactivateExpenseCategory(id: string, reason: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite, même principe que
  // deactivateBankAccount() (bank.ts) : volontairement JAMAIS gardée par
  // requireActiveEstablishment() — désactiver réduit l'exposition de
  // l'établissement, jamais ne l'augmente.
  const admin = await requireAdmin();
  // Phase 3B / Lot B2 — résolu côté serveur depuis la session.
  if (!admin.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de désactiver cette catégorie." };
  }

  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length === 0) {
    return { error: "Une justification est obligatoire pour désactiver une catégorie." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findFirst({
          where: { id, establishmentId: admin.establishmentId },
        });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (!existing.active) {
          return;
        }
        const result = await tx.expenseCategory.updateMany({
          where: { id, establishmentId: admin.establishmentId },
          data: { active: false },
        });
        if (result.count === 0) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_DEACTIVATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: trimmedReason,
            oldValue: { active: true },
            newValue: { active: false },
            establishmentId: admin.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ExpenseCategoryActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  return {};
}

/**
 * Section 17 — suppression physique refusée si au moins une dépense
 * référence la catégorie (comptage explicite avant suppression, même
 * pattern que deleteTariff dans tariffs.ts — un message clair plutôt que de
 * laisser remonter l'erreur FK brute de `onDelete: Restrict`, qui reste en
 * place comme filet de sécurité). Justification obligatoire dans tous les
 * cas.
 */
export async function deleteExpenseCategory(id: string, reason: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : une suppression
  // est gardée au même titre que deleteTariff() (tariffs.ts, déjà gardée
  // depuis D12-O11) — jamais traitée comme risk-reducing au même titre qu'une
  // simple désactivation.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de supprimer cette catégorie." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de supprimer cette catégorie." };
  }

  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length === 0) {
    return { error: "Une justification est obligatoire pour supprimer une catégorie." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findFirst({
          where: { id, establishmentId: admin.establishmentId },
        });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        // Phase 3D / Lot D7, règle 6 — recherche de référence limitée
        // explicitement au même établissement : ne jamais supprimer une
        // catégorie référencée par les dépenses d'un autre établissement,
        // et ne jamais toucher à ces dépenses (aucune écriture sur `Expense`
        // ici, inchangé). La contrainte `onDelete: Restrict` déjà en place
        // sur la relation reste le filet de sécurité final si une
        // incohérence de données existait malgré tout.
        const usageCount = await tx.expense.count({
          where: { categoryId: id, establishmentId: admin.establishmentId },
        });
        if (usageCount > 0) {
          throw new ExpenseCategoryActionError(
            "Cette catégorie est référencée par au moins une dépense et ne peut pas être supprimée. Désactivez-la à la place.",
          );
        }
        const result = await tx.expenseCategory.deleteMany({
          where: { id, establishmentId: admin.establishmentId },
        });
        if (result.count === 0) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_DELETED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: trimmedReason,
            oldValue: { name: existing.name, active: existing.active, position: existing.position },
            newValue: Prisma.DbNull,
            establishmentId: admin.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ExpenseCategoryActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant la suppression. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  return {};
}
