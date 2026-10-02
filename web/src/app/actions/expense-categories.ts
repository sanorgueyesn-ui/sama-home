"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/dal";
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

async function findDuplicateName(
  tx: Prisma.TransactionClient,
  name: string,
  excludeId?: string,
) {
  return tx.expenseCategory.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
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
  const admin = await requireAdmin();

  const parsed = ExpenseCategoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  }

  try {
    const category = await prisma.$transaction(
      async (tx) => {
        if (await findDuplicateName(tx, parsed.data)) {
          throw new ExpenseCategoryActionError("Une catégorie porte déjà exactement ce nom.");
        }
        const maxPosition = await tx.expenseCategory.aggregate({ _max: { position: true } });
        const position = (maxPosition._max.position ?? -1) + 1;

        const created = await tx.expenseCategory.create({
          data: { name: parsed.data, active: true, position },
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
  const admin = await requireAdmin();

  const parsed = ExpenseCategoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom invalide." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findUnique({ where: { id } });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (existing.name === parsed.data) {
          return;
        }
        if (await findDuplicateName(tx, parsed.data, id)) {
          throw new ExpenseCategoryActionError("Une catégorie porte déjà exactement ce nom.");
        }
        await tx.expenseCategory.update({ where: { id }, data: { name: parsed.data } });
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_UPDATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: null,
            oldValue: { name: existing.name },
            newValue: { name: parsed.data },
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
  const admin = await requireAdmin();

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findUnique({ where: { id } });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (existing.active) {
          return;
        }
        await tx.expenseCategory.update({ where: { id }, data: { active: true } });
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_ACTIVATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: null,
            oldValue: { active: false },
            newValue: { active: true },
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
  const admin = await requireAdmin();

  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length === 0) {
    return { error: "Une justification est obligatoire pour désactiver une catégorie." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findUnique({ where: { id } });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        if (!existing.active) {
          return;
        }
        await tx.expenseCategory.update({ where: { id }, data: { active: false } });
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_DEACTIVATED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: trimmedReason,
            oldValue: { active: true },
            newValue: { active: false },
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
  const admin = await requireAdmin();

  const trimmedReason = reason?.trim() ?? "";
  if (trimmedReason.length === 0) {
    return { error: "Une justification est obligatoire pour supprimer une catégorie." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.expenseCategory.findUnique({ where: { id } });
        if (!existing) {
          throw new ExpenseCategoryActionError("Catégorie introuvable.");
        }
        const usageCount = await tx.expense.count({ where: { categoryId: id } });
        if (usageCount > 0) {
          throw new ExpenseCategoryActionError(
            "Cette catégorie est référencée par au moins une dépense et ne peut pas être supprimée. Désactivez-la à la place.",
          );
        }
        await tx.expenseCategory.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: "EXPENSE_CATEGORY_DELETED",
            entityType: "ExpenseCategory",
            entityId: id,
            reason: trimmedReason,
            oldValue: { name: existing.name, active: existing.active, position: existing.position },
            newValue: Prisma.DbNull,
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
