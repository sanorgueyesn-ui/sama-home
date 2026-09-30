"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import {
  CreateUserSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
  type CreateUserFormState,
  type UpdateUserFormState,
  type ResetPasswordFormState,
} from "@/lib/definitions";

/**
 * Bloc 9/11 — every function here re-checks ADMIN server-side via
 * requireAdmin(), independently of whatever the UI shows or hides. A
 * GESTIONNAIRE calling one of these directly (e.g. by replaying a request)
 * is redirected home exactly like an unauthenticated user is redirected to
 * /login — never a silent no-op, never trusted client-side gating alone.
 */

export async function createUser(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  await requireAdmin();

  const parsed = CreateUserSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { username, name, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { errors: { username: ["Cet identifiant est déjà utilisé."] } };
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({ data: { username, name, passwordHash, role } });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}

export async function updateUser(
  id: string,
  _prevState: UpdateUserFormState,
  formData: FormData,
): Promise<UpdateUserFormState> {
  await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { message: "Utilisateur introuvable." };
  }

  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({ where: { id }, data: parsed.data });

  revalidatePath("/settings/users");
  redirect("/settings/users?updated=1");
}

/** Bloc 9 — admin sets a new password directly; the old one is never needed (that's the point of a reset, unlike Bloc 10's self-service flow). */
export async function resetUserPassword(
  id: string,
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { message: "Utilisateur introuvable." };
  }

  const parsed = ResetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/settings/users");
  redirect(`/settings/users?passwordReset=1`);
}
