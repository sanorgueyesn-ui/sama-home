"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mail";

export type ForgotPasswordState = {
  step: "REQUEST" | "CODE" | "SUCCESS";
  email?: string;
  maskedEmail?: string;
  error?: string;
  accountNotFound?: boolean;
  message?: string;
  success?: boolean;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${visible}@${domain}`;
}

/**
 * Étape 1 : Demande de réinitialisation de mot de passe
 * Vérifie l'utilisateur, génère un code OTP à 6 chiffres et envoie un e-mail sécurisé.
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const ip = await getClientIp();
  const rateLimitKey = `forgot_password:${ip}`;
  const rate = checkRateLimit(rateLimitKey, 10, 15 * 60);

  if (!rate.allowed) {
    const minutesLeft = Math.ceil(rate.retryAfterSeconds / 60);
    return {
      step: "REQUEST",
      error: `Trop de tentatives de réinitialisation. Veuillez patienter ${minutesLeft} minute(s) avant de réessayer.`,
    };
  }

  const rawIdentifier = formData.get("identifier")?.toString()?.trim();
  if (!rawIdentifier || rawIdentifier.length < 3) {
    return {
      step: "REQUEST",
      error: "Veuillez renseigner votre adresse e-mail ou votre identifiant de connexion.",
    };
  }

  const identifier = rawIdentifier.toLowerCase();

  // Recherche de l'utilisateur par e-mail ou nom d'utilisateur
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
    },
  });

  // Si le compte n'existe pas dans la plateforme
  if (!user) {
    return {
      step: "REQUEST",
      accountNotFound: true,
      error: "Cette adresse e-mail n'existe pas sur la plateforme. Pas besoin d'envoyer un code de validation.",
    };
  }

  // Déterminer l'e-mail de destination
  const targetEmail = user.email || (user.username && user.username.includes("@") ? user.username : null);

  // Si l'utilisateur n'a pas d'adresse e-mail enregistrée
  if (!targetEmail) {
    return {
      step: "REQUEST",
      error: "Ce compte ne dispose pas d'adresse e-mail configurée. Veuillez contacter un administrateur pour réinitialiser votre mot de passe.",
    };
  }

  // Génération d'un code OTP à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    // Nettoyer les anciennes demandes pour cette adresse
    await prisma.passwordResetToken.deleteMany({
      where: { email: { equals: targetEmail, mode: "insensitive" } },
    });

    // Enregistrer le nouveau jeton sécurisé
    await prisma.passwordResetToken.create({
      data: {
        email: targetEmail.toLowerCase(),
        code,
        expiresAt,
        attempts: 0,
      },
    });

    // Envoyer l'e-mail avec le modèle sécurisé
    const mailResult = await sendPasswordResetEmail({
      to: targetEmail,
      code,
      name: user.name,
    });

    if (mailResult.success) {
      return {
        step: "CODE",
        email: targetEmail,
        maskedEmail: maskEmail(targetEmail),
        message: `Un code de sécurité à 6 chiffres a été envoyé à votre adresse e-mail (${maskEmail(targetEmail)}).`,
      };
    } else {
      console.error("[requestPasswordReset] Échec d'envoi du mail :", mailResult.error);
      const isConfigError =
        mailResult.error?.includes("SMTP_PASS") ||
        mailResult.error?.includes("Missing credentials");
      return {
        step: "REQUEST",
        error: isConfigError
          ? "Le serveur d'envoi d'e-mails n'est pas encore activé (clé SMTP_PASS non renseignée dans le fichier .env). Aucun e-mail n'a pu être expédié."
          : "Impossible d'expédier l'e-mail contenant le code de sécurité. Veuillez réessayer ultérieurement.",
      };
    }
  } catch (err) {
    console.error("requestPasswordReset() error:", err);
    return {
      step: "REQUEST",
      error: "Une erreur est survenue lors de l'envoi de l'e-mail. Veuillez réessayer.",
    };
  }
}

/**
 * Étape 2 : Confirmation du code et enregistrement du nouveau mot de passe
 */
export async function confirmPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email")?.toString()?.trim().toLowerCase();
  const code = formData.get("code")?.toString()?.trim();
  const newPassword = formData.get("newPassword")?.toString()?.trim();
  const confirmPassword = formData.get("confirmPassword")?.toString()?.trim();

  if (!email) {
    return { step: "REQUEST", error: "Session expirée. Veuillez recommencer la procédure." };
  }

  if (!code || code.length !== 6) {
    return {
      step: "CODE",
      email,
      maskedEmail: maskEmail(email),
      error: "Veuillez saisir le code de sécurité à 6 chiffres complet.",
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      step: "CODE",
      email,
      maskedEmail: maskEmail(email),
      error: "Le nouveau mot de passe doit comporter au moins 8 caractères.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      step: "CODE",
      email,
      maskedEmail: maskEmail(email),
      error: "Les deux mots de passe ne correspondent pas.",
    };
  }

  // Rechercher le jeton de réinitialisation
  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord) {
    return {
      step: "REQUEST",
      error: "Aucune demande de réinitialisation active trouvée pour cette adresse. Veuillez en demander une nouvelle.",
    };
  }

  // Vérification de l'expiration (15 minutes)
  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
    return {
      step: "REQUEST",
      error: "Ce code a expiré (délai de 15 minutes dépassé). Veuillez demander un nouveau code.",
    };
  }

  // Vérification du nombre maximal de tentatives (5 max)
  if (tokenRecord.attempts >= 5) {
    await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } });
    return {
      step: "REQUEST",
      error: "Nombre maximal de tentatives incorrectes dépassé. Par mesure de sécurité, veuillez demander un nouveau code.",
    };
  }

  // Vérification de la correspondance du code
  if (tokenRecord.code !== code) {
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { attempts: { increment: 1 } },
    });
    const remainingAttempts = 4 - tokenRecord.attempts;
    return {
      step: "CODE",
      email,
      maskedEmail: maskEmail(email),
      error: `Code de sécurité incorrect. ${remainingAttempts > 0 ? `Il vous reste ${remainingAttempts} tentative(s).` : "Dernière tentative."}`,
    };
  }

  // Code valide ! Recherche du compte utilisateur
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { username: { equals: email, mode: "insensitive" } },
      ],
    },
  });

  if (!user) {
    // Si l'utilisateur n'existe pas (cas de simulation anti-enumeration)
    return {
      step: "SUCCESS",
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès.",
    };
  }

  try {
    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Mise à jour du mot de passe
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // 2. Révocation de TOUTES les sessions actives pour ce compte (protection essentielle)
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      // 3. Suppression du jeton consommé
      await tx.passwordResetToken.deleteMany({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      // 4. Inscription dans le journal d'audit de sécurité
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_PASSWORD_RESET_SELF",
          entityType: "User",
          entityId: user.id,
          reason: "Réinitialisation autonome réussie par validation OTP e-mail",
          establishmentId: user.establishmentId,
        },
      });
    });

    return {
      step: "SUCCESS",
      success: true,
      message: "Votre mot de passe a été modifié avec succès ! Vous pouvez maintenant vous connecter en toute sécurité.",
    };
  } catch (err) {
    console.error("confirmPasswordReset() error:", err);
    return {
      step: "CODE",
      email,
      maskedEmail: maskEmail(email),
      error: "Une erreur est survenue lors de l'enregistrement de votre mot de passe. Veuillez réessayer.",
    };
  }
}
