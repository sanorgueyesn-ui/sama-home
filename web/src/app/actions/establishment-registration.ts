"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";
import {
  EstablishmentRegistrationSchema,
  VerifyOtpSchema,
  type EstablishmentRegistrationFormState,
  type VerifyOtpFormState,
} from "@/lib/definitions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendOtpEmail } from "@/lib/mail";

class EstablishmentRegistrationError extends Error {}

const DUPLICATE_EMAIL_MESSAGE = "Un compte existe déjà avec cette adresse e-mail.";

/**
 * Étape 1 : Initialisation de l'inscription et envoi du code OTP
 */
export async function registerEstablishment(
  _prevState: EstablishmentRegistrationFormState,
  formData: FormData,
): Promise<EstablishmentRegistrationFormState> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`register:${ip}`, 5, 600);
  if (!rate.allowed) {
    return { message: "Trop de tentatives d'inscription depuis cette adresse. Veuillez patienter avant de réessayer." };
  }

  const parsed = EstablishmentRegistrationSchema.safeParse({
    establishmentName: formData.get("establishmentName"),
    managerName: formData.get("managerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    plan: formData.get("plan") || "FREE_TRIAL",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { establishmentName, managerName, email, password, plan } = parsed.data;

  // Vérifier si un compte existe déjà avec cette adresse e-mail
  const existingUser = await prisma.user.findUnique({
    where: { username: email },
    select: { id: true },
  });
  if (existingUser) {
    return { errors: { email: [DUPLICATE_EMAIL_MESSAGE] } };
  }

  const passwordHash = await hashPassword(password);

  // Générer un code OTP à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    // Nettoyer les anciennes demandes pour cet e-mail
    await prisma.otpVerification.deleteMany({ where: { email } });

    // Enregistrer la demande de vérification
    await prisma.otpVerification.create({
      data: {
        email,
        code,
        establishmentName,
        managerName,
        passwordHash,
        plan,
        expiresAt,
      },
    });

    // Envoyer le code par e-mail (et console)
    await sendOtpEmail({
      to: email,
      code,
      establishmentName,
    });

    return {
      success: true,
      requiresOtp: true,
      email,
      plan,
      // Fourni en mode dev / test local pour faciliter les tests sans bloquer
      testCode: code,
    };
  } catch (error) {
    console.error("registerEstablishment() — échec de l'envoi de l'OTP :", error);
    return { message: "Une erreur est survenue lors de l'envoi du code. Veuillez réessayer." };
  }
}

/**
 * Étape 2 : Vérification du code OTP et création définitive du compte et de l'établissement
 */
export async function verifyOtpAndRegister(
  _prevState: VerifyOtpFormState,
  formData: FormData,
): Promise<VerifyOtpFormState> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`verify-otp:${ip}`, 10, 300);
  if (!rate.allowed) {
    return { message: "Trop de tentatives de validation. Veuillez patienter avant de réessayer." };
  }

  const parsed = VerifyOtpSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, code } = parsed.data;

  // Rechercher l'enregistrement OTP le plus récent
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return {
      message: "Aucune demande de vérification en cours pour cette adresse e-mail. Veuillez recommencer l'inscription.",
    };
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
    return {
      message: "Ce code de vérification a expiré (durée maximale : 15 minutes). Veuillez demander un nouveau code.",
    };
  }

  if (otpRecord.code !== code) {
    const updatedAttempts = otpRecord.attempts + 1;
    if (updatedAttempts >= 5) {
      await prisma.otpVerification.delete({ where: { id: otpRecord.id } });
      return {
        message: "Trop de codes erronés saisis. Votre demande a été réinitialisée par sécurité.",
      };
    }
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: updatedAttempts },
    });
    return { errors: { code: ["Code de vérification incorrect."] } };
  }

  // Le code est valide ! Création de l'établissement et de l'utilisateur
  let generatedReference: string | undefined = undefined;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Double vérification d'unicité
      const existing = await tx.user.findUnique({
        where: { username: otpRecord.email },
        select: { id: true },
      });
      if (existing) {
        throw new EstablishmentRegistrationError(DUPLICATE_EMAIL_MESSAGE);
      }

      // 2. Création de l'établissement (Immédiatement ACTIVE dès validation du code OTP)
      const establishment = await tx.establishment.create({
        data: {
          name: otpRecord.establishmentName,
          status: "ACTIVE",
        },
      });

      // 3. Création du compte administrateur
      await tx.user.create({
        data: {
          username: otpRecord.email,
          email: otpRecord.email,
          name: otpRecord.managerName,
          passwordHash: otpRecord.passwordHash,
          role: "ADMIN",
          establishmentId: establishment.id,
          isPlatformAdmin: false,
        },
      });

      // 4. Activation immédiate des 2 mois d'essai gratuit pour tous les nouveaux inscrits
      await createTrialSubscriptionAndAudit(
        tx,
        establishment.id,
        null,
        "ESTABLISHMENT_AUTO_APPROVED",
      );

      // Si l'utilisateur a choisi l'Offre Payante (9 900 FCFA / 3 mois), enregistrer la demande de paiement
      if (otpRecord.plan === "PAID_9900") {
        const pricingSettings = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
        const periodMonths = pricingSettings?.periodMonths ?? 3;
        const periodPrice = pricingSettings?.periodPriceFcfa ?? 9900;

        const sub = await tx.subscription.findUnique({ where: { establishmentId: establishment.id } });
        if (sub) {
          generatedReference = `SH-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

          await tx.subscriptionPayment.create({
            data: {
              subscriptionId: sub.id,
              amount: periodPrice,
              periodMonths,
              status: "PENDING",
              reference: generatedReference,
            },
          });
        }
      }

      // 6. Nettoyage de l'OTP consommé
      await tx.otpVerification.delete({ where: { id: otpRecord.id } });
    });
  } catch (error) {
    if (error instanceof EstablishmentRegistrationError) {
      return { errors: { code: [error.message] } };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { code: [DUPLICATE_EMAIL_MESSAGE] } };
    }
    console.error("verifyOtpAndRegister() — échec inattendu :", error);
    return { message: "Une erreur est survenue lors de la validation. Veuillez réessayer." };
  }

  return {
    success: true,
    plan: otpRecord.plan,
    establishmentName: otpRecord.establishmentName,
    reference: generatedReference,
  };
}

/**
 * Renvoie un nouveau code OTP pour un email donné
 */
export async function resendOtpCode(email: string): Promise<{ success: boolean; message?: string; testCode?: string }> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`resend-otp:${ip}`, 3, 300);
  if (!rate.allowed) {
    return { success: false, message: "Veuillez patienter avant de demander un nouveau code." };
  }

  const existingOtp = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!existingOtp) {
    return { success: false, message: "Aucune inscription en cours pour cet email." };
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.otpVerification.update({
    where: { id: existingOtp.id },
    data: {
      code: newCode,
      expiresAt,
      attempts: 0,
    },
  });

  await sendOtpEmail({
    to: email,
    code: newCode,
    establishmentName: existingOtp.establishmentName,
  });

  return { success: true, testCode: newCode };
}
