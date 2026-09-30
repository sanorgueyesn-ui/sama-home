"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SettingsSchema, ChangePasswordSchema, type SettingsFormState, type ChangePasswordFormState } from "@/lib/definitions";
import { SETTINGS_ID } from "@/lib/settings-data";

/** Bloc 4/5/16 — server-validated, upserted against the fixed singleton row. */
export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await verifySession();

  const parsed = SettingsSchema.safeParse({
    establishmentName: formData.get("establishmentName"),
    phone: formData.get("phone"),
    secondaryPhone: formData.get("secondaryPhone"),
    address: formData.get("address"),
    email: formData.get("email"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: parsed.data,
      create: { id: SETTINGS_ID, ...parsed.data },
    });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

/**
 * Bloc 10 — "Modifier mon mot de passe" (self-service). The CURRENT password
 * is re-verified server-side via the exact same verifyPassword used by
 * login (Bloc 10: "ne jamais faire confiance à une validation uniquement
 * côté navigateur") before any hash is written.
 */
export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const { userId } = await verifySession();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return { errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  redirect("/settings?passwordChanged=1");
}
