"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, type LoginFormState } from "@/lib/definitions";

const GENERIC_ERROR = "Identifiant ou mot de passe incorrect.";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { username, password, remember } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });

  // verifyPassword always runs, even when `user` is null (falls back to a
  // dummy hash), so a non-existent username takes the same time as a wrong
  // password — this avoids leaking which usernames exist via response timing.
  const isValid = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !isValid) {
    return { error: GENERIC_ERROR };
  }

  await createSession(user.id, remember);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
