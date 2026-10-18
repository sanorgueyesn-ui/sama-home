"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, type LoginFormState } from "@/lib/definitions";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyGoogleAuthToken } from "@/lib/session-token";

const GENERIC_ERROR = "Identifiant ou mot de passe incorrect.";

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
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
  });

  // verifyPassword always runs, even when `user` is null (falls back to a
  // dummy hash), so a non-existent username takes the same time as a wrong
  // password - this avoids leaking which usernames exist via response timing.
  const isValid = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !isValid) {
    return { error: GENERIC_ERROR };
  }

  // Vérifier le statut de l'établissement si l'utilisateur est rattaché à un établissement
  if (user.establishmentId) {
    const establishment = await prisma.establishment.findUnique({
      where: { id: user.establishmentId },
      select: { status: true },
    });

    if (establishment?.status === "PENDING") {
      return {
        error:
          "Votre établissement est en attente d'approbation par l'administrateur de SAMA HOME. Vous aurez accès dès sa validation.",
      };
    }

    if (establishment?.status === "REJECTED") {
      return {
        error: "La demande d'inscription pour cet établissement a été refusée par l'administrateur.",
      };
    }

    if (establishment?.status === "SUSPENDED") {
      return {
        error: "L'accès pour cet établissement est actuellement suspendu. Veuillez contacter le support.",
      };
    }
  }

  resetRateLimit(rateLimitKey);
  await createSession(user.id, remember);
  redirect(user.isPlatformAdmin ? "/plateforme" : "/");
}

export async function setPasswordWithGoogleToken(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const token = formData.get("token")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!token) {
    return { error: "Session Google expirée. Veuillez vous reconnecter avec Google." };
  }
  if (!password || password.length < 8) {
    return { error: "Le mot de passe doit comporter au moins 8 caractères." };
  }
  if (password !== confirmPassword) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const payload = await verifyGoogleAuthToken(token);
  if (!payload || !payload.email) {
    return { error: "Session Google invalide ou expirée. Veuillez vous reconnecter avec Google." };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: payload.email }, { email: payload.email }] },
  });
  if (!user) {
    return { error: "Utilisateur introuvable." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await createSession(user.id, true);
  redirect(user.isPlatformAdmin ? "/plateforme" : "/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

