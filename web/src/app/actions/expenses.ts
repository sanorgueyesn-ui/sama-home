"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { ExpenseSchema, type ExpenseFormState } from "@/lib/definitions";

/**
 * Bloc 10 — création. No transaction needed (Bloc 18: two concurrent
 * expenses are both independently valid — there is no shared resource or
 * "reste disponible" to protect here, unlike Payment). A plain, atomic
 * single-row insert is sufficient and avoids inventing locking complexity
 * the brief explicitly warns against.
 */
export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  await verifySession();

  const parsed = ExpenseSchema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { category, amount, method, reference, note } = parsed.data;

  try {
    await prisma.expense.create({ data: { category, amount, method, reference, note } });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/depenses");
  redirect("/depenses?created=1");
}
