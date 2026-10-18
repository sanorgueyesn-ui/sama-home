"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveEstablishment } from "@/lib/dal";
import { ExpenseSchema, type ExpenseFormState } from "@/lib/definitions";

class ExpenseActionError extends Error {}

/**
 * Bloc 16.2 — `category` (enum fermé) remplacé par `categoryId` (Bloc
 * 16.1). La catégorie référencée doit être revérifiée ici contre la DB —
 * Zod ne valide que la FORME de `categoryId` (une chaîne non vide), jamais
 * son existence ni son activité. `categoryNameSnapshot` est toujours dérivé
 * de `category.name` lu serveur, jamais accepté depuis le formulaire (aucun
 * champ de ce nom n'est même lu dans `formData`, donc rien à filtrer — même
 * garantie structurelle que `userId` depuis le Bloc 15).
 *
 * Lecture de la catégorie + vérification `active` + création de la dépense
 * dans la même transaction Serializable : réduit la fenêtre entre "la
 * catégorie était active" et "la dépense est créée" face à une
 * désactivation concurrente (Bloc 16.2, section 6) — même niveau de
 * protection que findAvailabilityConflict + tx.rental.create dans
 * src/app/actions/rentals.ts, pas une architecture nouvelle.
 */
export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  // Phase 3G / Lot D12-O2 — action pilote du garde centralisé
  // requireActiveEstablishment() (voir audit D12-O1 : fichier à fonction
  // unique, aucun effet de bord S3, impact métier d'un faux refus le plus
  // faible des candidats). Remplace l'ancien contrôle `!user.establishmentId`
  // seul : couvre désormais aussi le statut de l'établissement et celui de
  // l'abonnement, strictement séparés (voir dal.ts).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer une dépense." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  const parsed = ExpenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { categoryId, amount, method, reference, note } = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3F / Lot D12-J — filtrée par établissement : une catégorie
        // d'un autre établissement suit désormais exactement le même
        // message "introuvable" déjà existant, jamais une dépense
        // référençant une catégorie extérieure.
        const category = await tx.expenseCategory.findFirst({
          where: { id: categoryId, establishmentId: user.establishmentId },
        });
        if (!category) {
          throw new ExpenseActionError("Catégorie introuvable.");
        }
        if (!category.active) {
          throw new ExpenseActionError(
            "Cette catégorie est désactivée et ne peut plus être utilisée pour une nouvelle dépense.",
          );
        }
        await tx.expense.create({
          data: {
            categoryId,
            categoryNameSnapshot: category.name,
            amount,
            method,
            reference,
            note,
            establishmentId: user.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof ExpenseActionError) {
      return { message: error.message };
    }
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  redirect("/depenses?created=1");
}
