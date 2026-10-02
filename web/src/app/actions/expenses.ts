"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
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
  await verifySession();

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
        const category = await tx.expenseCategory.findUnique({ where: { id: categoryId } });
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
