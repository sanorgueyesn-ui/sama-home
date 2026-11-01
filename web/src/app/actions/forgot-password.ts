"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mail";
import { OTP_MAX_ATTEMPTS, generateOtpCode, isWellFormedOtp, safeEqualOtp } from "@/lib/otp";

class ResetTokenAlreadyUsedError extends Error {}

// Étape 2c-2 — aucun champ ne permet de déduire l'existence d'un compte : plus d'indicateur
// « compte introuvable » ni d'adresse masquée issue de la base. `email` ne contient QUE la valeur
// saisie par l'utilisateur.
export type ForgotPasswordState = {
  step: "REQUEST" | "CODE" | "SUCCESS";
  email?: string;
  /** Retiré : plus aucune réponse ne peut porter cet indicateur (`never`). Conservé uniquement pour
   *  que d'anciens scripts manuels hors périmètre continuent de compiler. */
  accountNotFound?: never;
  error?: string;
  message?: string;
  success?: boolean;
};

// Messages publics GÉNÉRIQUES : identiques quel que soit l'état du compte ou du code.
const GENERIC_RESET_MESSAGE =
  "Vérifiez votre boîte e-mail. Si un compte correspond aux informations saisies, un code de sécurité à 6 chiffres vient de vous être envoyé à l'adresse e-mail associée. Ce code est valable 15 minutes. Pensez à vérifier vos courriers indésirables.";
const GENERIC_CODE_ERROR = "Code invalide ou expiré. Vérifiez le code reçu ou demandez-en un nouveau.";

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
  const rate = checkRateLimit(rateLimitKey, 15, 15 * 60);

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

  // Étape 2c-1 — plafond par identifiant (5 demandes / 15 min), appliqué AVANT toute recherche
  // et donc de façon identique que le compte existe ou non. Limitation en mémoire du processus :
  // non partagée entre instances. Contrepartie assumée : un tiers peut retarder la demande légitime
  // d'un identifiant connu pendant la fenêtre.
  const identifierRate = checkRateLimit(`forgot_issue:${identifier}`, 5, 15 * 60);
  if (!identifierRate.allowed) {
    const minutesLeft = Math.ceil(identifierRate.retryAfterSeconds / 60);
    return {
      step: "REQUEST",
      error: `Trop de tentatives de réinitialisation. Veuillez patienter ${minutesLeft} minute(s) avant de réessayer.`,
    };
  }

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

  // Étape 2c-2 (D2) — MÊME réponse publique dans tous les cas : compte existant avec e-mail,
  // identifiant inconnu, compte sans e-mail exploitable, compte supprimé, échec d'envoi ou erreur
  // interne. Rien de ce qui suit n'est visible dans la réponse ; les échecs sont seulement journalisés
  // (sans adresse). Envoi toujours SYNCHRONE (D6) : l'écart de temps de traitement reste un risque
  // résiduel connu, non corrigé ici.
  const targetEmail = user ? user.email || (user.username && user.username.includes("@") ? user.username : null) : null;

  if (!user) {
    // Nettoyage de sécurité préventif de tout jeton orphelin pour cette adresse
    await prisma.passwordResetToken.deleteMany({
      where: { email: { equals: identifier, mode: "insensitive" } },
    });
  } else if (!targetEmail) {
    console.warn("requestPasswordReset() — compte sans adresse e-mail exploitable : aucun code envoyé.");
  } else {
    // Génération d'un code OTP à 6 chiffres
    const code = generateOtpCode();
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

      // Envoyer l'e-mail avec le modèle sécurisé et le repli automatique de port
      const mailResult = await sendPasswordResetEmail({
        to: targetEmail,
        code,
        name: user.name,
      });
      if (!mailResult.success) {
        console.error("requestPasswordReset() — e-mail de réinitialisation non envoyé.");
      }
    } catch (err) {
      console.error("requestPasswordReset() error:", err);
    }
  }

  return { step: "CODE", email: rawIdentifier, message: GENERIC_RESET_MESSAGE };
}

/**
 * Étape 2 : Confirmation du code et enregistrement du nouveau mot de passe
 */
export async function confirmPasswordReset(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const rawEmail = formData.get("email")?.toString()?.trim().toLowerCase();
  const code = formData.get("code")?.toString()?.trim();
  const newPassword = formData.get("newPassword")?.toString()?.trim();
  const confirmPassword = formData.get("confirmPassword")?.toString()?.trim();

  if (!rawEmail) {
    return { step: "REQUEST", error: "Session expirée. Veuillez recommencer la procédure." };
  }

  // Étape 2c-1 — plafond par IP (15 / 15 min) sur la confirmation, avant tout accès à la base.
  // Dépend de la fiabilité de l'IP lue dans `x-forwarded-for` (voir rate-limit.ts) et, comme
  // toute limitation en mémoire, n'est pas partagée entre instances.
  const ip = await getClientIp();
  const ipRate = checkRateLimit(`forgot_confirm:${ip}`, 15, 15 * 60);
  if (!ipRate.allowed) {
    const minutesLeft = Math.ceil(ipRate.retryAfterSeconds / 60);
    return {
      step: "CODE",
      email: rawEmail,
      error: `Trop de tentatives de validation. Veuillez patienter ${minutesLeft} minute(s) avant de réessayer.`,
    };
  }

  // Valeur SAISIE par l'utilisateur : c'est la SEULE à jamais figurer dans une réponse publique.
  const typedEmail = rawEmail;

  // Résoudre l'adresse e-mail si un nom d'utilisateur a été fourni. `email` est une valeur INTERNE
  // (clé de plafond, recherche du jeton, du compte) ; elle peut venir de la base et ne doit JAMAIS
  // être renvoyée au client (sinon : fuite de l'adresse et de l'existence du compte).
  let email = rawEmail;
  if (!email.includes("@")) {
    const matchedUser = await prisma.user.findFirst({
      where: { username: { equals: email, mode: "insensitive" } },
      select: { email: true },
    });
    if (matchedUser?.email) {
      email = matchedUser.email.toLowerCase();
    }
  }

  // Plafond par adresse résolue (10 / 15 min) : empêche de contourner le plafond IP en changeant
  // d'adresse IP, ou en alternant identifiant et e-mail (la clé est l'adresse canonique).
  const addressRate = checkRateLimit(`forgot_confirm_addr:${email}`, 10, 15 * 60);
  if (!addressRate.allowed) {
    const minutesLeft = Math.ceil(addressRate.retryAfterSeconds / 60);
    return {
      step: "CODE",
      email: typedEmail,
      error: `Trop de tentatives de validation. Veuillez patienter ${minutesLeft} minute(s) avant de réessayer.`,
    };
  }

  // Format strict (6 chiffres) : une entrée mal formée ne peut jamais correspondre et ne consomme
  // aucun essai du code.
  if (!code || !isWellFormedOtp(code)) {
    return {
      step: "CODE",
      email: typedEmail,
      error: "Veuillez saisir le code de sécurité à 6 chiffres complet.",
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      step: "CODE",
      email: typedEmail,
      error: "Le nouveau mot de passe doit comporter au moins 8 caractères.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      step: "CODE",
      email: typedEmail,
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

  // Étape 2c-2 (D3) — message UNIQUE pour : jeton absent, code expiré, code épuisé, code déjà
  // consommé, code faux, compte supprimé. Aucun détail ne permet de deviner l'état d'une demande
  // (ni donc l'existence d'un compte) ; le nombre d'essais restants n'est plus communiqué.
  if (!tokenRecord) {
    return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
  }

  // Vérification de l'expiration (15 minutes)
  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    // deleteMany (et non delete) : ne lève rien si une requête concurrente a déjà supprimé la ligne.
    await prisma.passwordResetToken.deleteMany({ where: { id: tokenRecord.id } });
    return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
  }

  // Étape 2c-1 — RÉSERVATION ATOMIQUE d'un essai AVANT toute comparaison. L'ancienne séquence
  // « lire le compteur, tester, incrémenter plus tard » laissait des requêtes parallèles passer
  // toutes le test avant le premier incrément. Ici, une seule instruction conditionnelle
  // (`attempts < 5` ET non expiré) incrémente le compteur : au plus OTP_MAX_ATTEMPTS requêtes
  // obtiennent un essai par code, quelle que soit la concurrence. Chaque évaluation consomme un
  // essai, y compris celle du bon code.
  const claim = await prisma.passwordResetToken.updateMany({
    where: { id: tokenRecord.id, attempts: { lt: OTP_MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  if (claim.count !== 1) {
    // Plus d'essai disponible (ou code déjà consommé / expiré entre-temps) : on retire le code épuisé.
    await prisma.passwordResetToken.deleteMany({
      where: { id: tokenRecord.id, attempts: { gte: OTP_MAX_ATTEMPTS } },
    });
    return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
  }

  // Vérification de la correspondance du code (temps constant, format déjà validé plus haut).
  if (!safeEqualOtp(tokenRecord.code, code)) {
    if (tokenRecord.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetToken.deleteMany({ where: { id: tokenRecord.id } });
    }
    return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
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
    // Compte supprimé ou devenu indisponible : même message que pour un code invalide.
    return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
  }

  try {
    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // 0. USAGE UNIQUE : le jeton est consommé en premier, par identifiant. Deux requêtes
      //    parallèles avec le bon code : une seule obtient `count === 1`, l'autre est refusée.
      const consumed = await tx.passwordResetToken.deleteMany({ where: { id: tokenRecord.id } });
      if (consumed.count !== 1) {
        throw new ResetTokenAlreadyUsedError();
      }

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
    if (err instanceof ResetTokenAlreadyUsedError) {
      return { step: "CODE", email: typedEmail, error: GENERIC_CODE_ERROR };
    }
    console.error("confirmPasswordReset() error:", err);
    return {
      step: "CODE",
      email: typedEmail,
      error: "Une erreur est survenue lors de l'enregistrement de votre mot de passe. Veuillez réessayer.",
    };
  }
}
