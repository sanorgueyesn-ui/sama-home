"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, type LoginFormState } from "@/lib/definitions";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyGoogleAuthToken } from "@/lib/session-token";
import { getFirstAuthorizedPlatformUrl } from "@/lib/permissions";
import { blockingStatus } from "@/lib/login-gate";
import { getT } from "@/lib/i18n/server";

const GENERIC_ERROR = "Identifiant ou mot de passe incorrect.";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const t = await getT();
  const ip = await getClientIp();
  const rateLimitKey = `login:${ip}`;
  const rate = checkRateLimit(rateLimitKey, 5, 60);
  if (!rate.allowed) {
    return {
      error: `Trop de tentatives de connexion infructueuses. Veuillez patienter ${rate.retryAfterSeconds} seconde(s) avant de réessayer.`,
    };
  }

  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { username, password, remember } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
    },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      name: true,
      role: true,
      isPlatformAdmin: true,
      permissions: true,
    },
  });

  // verifyPassword always runs, even when `user` is null (falls back to a
  // dummy hash), so a non-existent username takes the same time as a wrong
  // password - this avoids leaking which usernames exist via response timing.
  const isValid = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !isValid) {
    return { error: GENERIC_ERROR };
  }

  // Statut des espaces du compte (appartenances) : refus seulement si AUCUN n'est utilisable.
  // Règle et priorité des messages : src/lib/login-gate.ts (un seul espace = comportement d'avant).
  const spaces = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { establishment: { select: { status: true } } },
  });
  const blocked = blockingStatus(spaces.map((m) => m.establishment.status));
  if (blocked === "PENDING") {
    return {
      error:
        t("Votre établissement est en attente d'approbation par l'administrateur de SAMA HOME. Vous aurez accès dès sa validation."),
    };
  }
  if (blocked === "REJECTED") {
    return {
      error: t("La demande d'inscription pour cet établissement a été refusée par l'administrateur."),
    };
  }
  if (blocked === "SUSPENDED") {
    return {
      error: t("L'accès pour cet établissement est actuellement suspendu. Veuillez contacter le support."),
    };
  }

  resetRateLimit(rateLimitKey);
  await createSession(user.id, remember);
  if (user.isPlatformAdmin) {
    const target = getFirstAuthorizedPlatformUrl(user.permissions);
    redirect(target);
  }
  redirect("/dashboard");
}

export async function setPasswordWithGoogleToken(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const t = await getT();
  const cookieStore = await cookies();
  const token = formData.get("token")?.toString() || cookieStore.get("google_auth_token")?.value;
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!token) {
    return { error: t("Session Google expirée. Veuillez vous reconnecter avec Google.") };
  }
  if (!password || password.length < 8) {
    return { error: t("Le mot de passe doit comporter au moins 8 caractères.") };
  }
  if (password !== confirmPassword) {
    return { error: t("Les deux mots de passe ne correspondent pas.") };
  }

  const payload = await verifyGoogleAuthToken(token);
  if (!payload || !payload.email) {
    return { error: t("Session Google invalide ou expirée. Veuillez vous reconnecter avec Google.") };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: payload.email }, { email: payload.email }] },
  });
  if (!user) {
    return { error: t("Utilisateur introuvable.") };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Nettoyer le jeton à usage unique
  cookieStore.delete("google_auth_token");

  // Étape 2a : session NON persistante (plus de cookie de 30 jours après un parcours Google).
  await createSession(user.id, false);
  if (user.isPlatformAdmin) {
    const target = getFirstAuthorizedPlatformUrl(user.permissions);
    redirect(target);
  }
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

