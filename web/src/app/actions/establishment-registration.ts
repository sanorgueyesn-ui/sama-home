"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fromShellMode } from "@/lib/business-mode";
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
import { sendAccountExistsEmail, sendOtpEmail } from "@/lib/mail";
import { resolveOtpDispatch } from "@/lib/test-otp";
import { isBillingCycle, isPlanTier } from "@/lib/subscription-plans";
import { AUTO_APPROVE_NEW_ESTABLISHMENTS } from "@/lib/registration-policy";
import { DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/pricing-defaults";
import { verifyGoogleAuthToken } from "@/lib/session-token";
import { OTP_MAX_ATTEMPTS, generateOtpCode, isWellFormedOtp, safeEqualOtp } from "@/lib/otp";
import { getT } from "@/lib/i18n/server";

class EstablishmentRegistrationError extends Error {}

// Messages explicites d'existence : UNIQUEMENT pour le parcours Google (adresse prouvée par Google) et
// pour un conflit détecté dans la transaction par la personne qui détient le code valide.
const DUPLICATE_EMAIL_MESSAGE = "Un compte existe déjà avec cette adresse e-mail.";

// Étape 2c-2 — messages publics GÉNÉRIQUES (identiques que l'adresse soit libre, déjà inscrite ou
// sans inscription en cours) : aucun ne permet de déduire l'existence d'un compte.
const GENERIC_CODE_ERROR = "Code invalide ou expiré. Vérifiez le code reçu ou demandez-en un nouveau.";
const GENERIC_RESEND_MESSAGE =
  "Si votre demande est toujours en cours, un nouveau code vient d'être envoyé. Pensez à vérifier vos courriers indésirables.";
const OTP_SEND_FAILURE_MESSAGE =
  "Nous n'avons pas pu envoyer le code de vérification à votre adresse e-mail. Aucune inscription n'a été enregistrée : veuillez réessayer dans quelques instants ou contacter le support.";
const OTP_SEND_ERROR_MESSAGE = "Une erreur est survenue lors de l'envoi du code. Veuillez réessayer.";

/**
 * Étape 1 : Initialisation de l'inscription et envoi du code OTP
 */
export async function registerEstablishment(
  _prevState: EstablishmentRegistrationFormState,
  formData: FormData,
): Promise<EstablishmentRegistrationFormState> {
  const t = await getT();
  const ip = await getClientIp();
  const rate = checkRateLimit(`register:${ip}`, 5, 600);
  if (!rate.allowed) {
    return { message: t("Trop de tentatives d'inscription depuis cette adresse. Veuillez patienter avant de réessayer.") };
  }

  const parsed = EstablishmentRegistrationSchema.safeParse({
    establishmentName: formData.get("establishmentName"),
    managerName: formData.get("managerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    plan: formData.get("plan") || "FREE_TRIAL",
    activityMode: formData.get("activityMode") || "RESIDENCE",
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { establishmentName, managerName, email, password, plan, activityMode } = parsed.data;
  // Formule choisie sur la page d'accueil : simple preference, validee ici (jamais une valeur libre).
  const rawTier = formData.get("preferredPlanTier");
  const rawBilling = formData.get("preferredBilling");
  const preferredPlanTier = isPlanTier(rawTier) ? rawTier : null;
  const preferredBilling = isBillingCycle(rawBilling) ? rawBilling : null;

  // Inscription validée par Google OAuth ? (adresse prouvée par Google : le parcours Google garde
  // son comportement explicite, décision D8.)
  const cookieStore = await cookies();
  const googleToken = formData.get("googleToken")?.toString() || cookieStore.get("google_auth_token")?.value;
  const verifiedGoogleForGate = googleToken ? await verifyGoogleAuthToken(googleToken) : null;
  const isGoogleVerified = Boolean(verifiedGoogleForGate && verifiedGoogleForGate.email.toLowerCase() === email.toLowerCase());

  // Étape 2c-2 (D7) — plafond d'ÉMISSIONS de code par adresse : 5 / 15 min, partagé avec le renvoi
  // (même clé `otp-issue:`). Appliqué AVANT la recherche du compte, donc de façon identique que
  // l'adresse soit libre ou déjà inscrite. Le parcours Google n'émet aucun code et ne le consomme pas.
  // Limitation en mémoire du processus : locale, non distribuée entre instances.
  if (!isGoogleVerified) {
    const issueRate = checkRateLimit(`otp-issue:${email.trim().toLowerCase()}`, 5, 15 * 60);
    if (!issueRate.allowed) {
      return { message: t("Trop de tentatives d'inscription pour cette adresse. Veuillez patienter avant de réessayer.") };
    }
  }

  // Un compte existe-t-il déjà avec cette adresse e-mail ?
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username: email }, { email: email }] },
    select: { id: true },
  });
  if (existingUser && isGoogleVerified) {
    return { errors: { email: [DUPLICATE_EMAIL_MESSAGE] } };
  }

  // Hachage exécuté dans TOUTES les branches (adresse libre ou déjà inscrite) : plus de différence
  // manifeste de travail (bcrypt, coût 12) entre les deux réponses.
  const passwordHash = await hashPassword(password);

  if (googleToken) {
    const verifiedGoogle = await verifyGoogleAuthToken(googleToken);
    if (verifiedGoogle && verifiedGoogle.email.toLowerCase() === email.toLowerCase()) {
      let generatedReference: string | undefined = undefined;

      try {
        let isPendingApproval = false;

        await prisma.$transaction(async (tx) => {
          const existing = await tx.user.findFirst({
            where: { OR: [{ username: email }, { email: email }] },
            select: { id: true },
          });
          if (existing) {
            throw new EstablishmentRegistrationError(DUPLICATE_EMAIL_MESSAGE);
          }

          // Vérifier les réglages de modération de la plateforme
          const shouldAutoApprove = AUTO_APPROVE_NEW_ESTABLISHMENTS;
          const status = shouldAutoApprove ? "ACTIVE" : "PENDING";
          isPendingApproval = !shouldAutoApprove;

          const establishment = await tx.establishment.create({
            data: {
              name: establishmentName,
              status,
              businessMode: fromShellMode(activityMode),
              preferredPlanTier,
              preferredBilling,
            },
          });

          const adminUser = await tx.user.create({
            data: {
              username: email,
              email,
              name: managerName,
              passwordHash,
              role: "ADMIN",
              establishmentId: establishment.id,
              isPlatformAdmin: false,
            },
            select: { id: true },
          });
          // Socle multi-espaces : sans appartenance, le compte n'aurait aucun espace (dal.ts).
          await tx.membership.create({
            data: { userId: adminUser.id, establishmentId: establishment.id, role: "ADMIN" },
          });

          if (shouldAutoApprove) {
            await createTrialSubscriptionAndAudit(
              tx,
              establishment.id,
              null,
              "ESTABLISHMENT_AUTO_APPROVED",
            );
          } else {
            await tx.auditLog.create({
              data: {
                userId: null,
                action: "ESTABLISHMENT_REGISTERED",
                entityType: "Establishment",
                entityId: establishment.id,
                newValue: {
                  name: establishmentName,
                  status: "PENDING",
                  adminEmail: email,
                  plan,
                },
                establishmentId: establishment.id,
              },
            });
          }

          if (plan === "PAID_9900") {
            const pricingSettings = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
            const periodMonths = pricingSettings?.periodMonths ?? DEFAULT_PERIOD_MONTHS;
            const periodPrice = pricingSettings?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA;

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
        });

        cookieStore.delete("google_auth_token");

        return {
          success: true,
          googleRegistered: true,
          pendingApproval: isPendingApproval,
          plan,
          establishmentName,
          email,
          reference: generatedReference,
        };
      } catch (error) {
        if (error instanceof EstablishmentRegistrationError) {
          return { errors: { email: [error.message] } };
        }
        console.error("registerEstablishment(google) — échec :", error);
        return { message: t("Une erreur est survenue lors de la création de l'établissement.") };
      }
    }
  }


  // Adresse déjà inscrite (hors parcours Google) : MÊME réponse publique que pour une adresse libre.
  // Aucun compte, aucun OTP créé ; un message informatif SANS code est envoyé au titulaire de
  // l'adresse (envoi synchrone, même traitement d'échec que la branche « adresse libre »).
  if (existingUser) {
    try {
      const infoMail = await sendAccountExistsEmail({ to: email });
      const infoDispatch = resolveOtpDispatch({ mailSent: infoMail.success, code: "", env: process.env });
      if (!infoDispatch.delivered) {
        console.error("registerEstablishment() — e-mail d'information non envoyé.");
        return { message: OTP_SEND_FAILURE_MESSAGE };
      }
    } catch (error) {
      console.error("registerEstablishment() — échec de l'envoi de l'e-mail d'information :", error);
      return { message: OTP_SEND_ERROR_MESSAGE };
    }
    return { success: true, requiresOtp: true, email, plan };
  }

  // Générer un code OTP à 6 chiffres (crypto.randomInt, format 100000-999999 inchangé)
  const code = generateOtpCode();
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
        // Conservé côté serveur jusqu'à la validation du code : jamais relu depuis le navigateur.
        businessMode: fromShellMode(activityMode),
        preferredPlanTier,
        preferredBilling,
        expiresAt,
      },
    });

    // Envoyer le code par e-mail
    const mail = await sendOtpEmail({
      to: email,
      code,
      establishmentName,
    });

    // Décision unique (src/lib/test-otp.ts) : le code n'est JAMAIS renvoyé au
    // navigateur hors environnement local explicitement autorisé. Hors local,
    // l'inscription n'avance que si l'e-mail est réellement parti.
    const dispatch = resolveOtpDispatch({ mailSent: mail.success, code, env: process.env });
    if (!dispatch.delivered) {
      console.error("registerEstablishment() — e-mail OTP non envoyé, demande annulée.");
      await prisma.otpVerification.deleteMany({ where: { email } });
      return { message: OTP_SEND_FAILURE_MESSAGE };
    }

    return {
      success: true,
      requiresOtp: true,
      email,
      plan,
      // Parcours de test local uniquement (absent en production).
      ...(dispatch.testCode ? { testCode: dispatch.testCode } : {}),
    };
  } catch (error) {
    console.error("registerEstablishment() — échec de l'envoi de l'OTP :", error);
    return { message: OTP_SEND_ERROR_MESSAGE };
  }
}

/**
 * Étape 2 : Vérification du code OTP et création définitive du compte et de l'établissement
 */
export async function verifyOtpAndRegister(
  _prevState: VerifyOtpFormState,
  formData: FormData,
): Promise<VerifyOtpFormState> {
  const t = await getT();
  const ip = await getClientIp();
  const rate = checkRateLimit(`verify-otp:${ip}`, 10, 300);
  if (!rate.allowed) {
    return { message: t("Trop de tentatives de validation. Veuillez patienter avant de réessayer.") };
  }

  const parsed = VerifyOtpSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, code } = parsed.data;

  // Format strict (6 chiffres) : une entrée mal formée ne peut jamais correspondre et ne consomme
  // aucun essai.
  if (!isWellFormedOtp(code)) {
    return { errors: { code: ["Le code doit comporter exactement 6 chiffres."] } };
  }

  // Rechercher l'enregistrement OTP le plus récent
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  // Étape 2c-2 (D3) — message UNIQUE pour : demande absente, code expiré, code épuisé, code déjà
  // consommé, code faux. Aucun détail ne permet de deviner l'état d'une inscription en cours.
  if (!otpRecord) {
    return { errors: { code: [GENERIC_CODE_ERROR] } };
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    // deleteMany (et non delete) : ne lève rien si une requête concurrente a déjà supprimé la ligne.
    await prisma.otpVerification.deleteMany({ where: { id: otpRecord.id } });
    return { errors: { code: [GENERIC_CODE_ERROR] } };
  }

  // Étape 2c-1 — RÉSERVATION ATOMIQUE d'un essai AVANT toute comparaison. L'ancien calcul
  // « attempts + 1 » écrit en absolu depuis une lecture périmée laissait des requêtes parallèles
  // écrire toutes la même valeur : le compteur n'atteignait jamais la limite. Ici une seule
  // instruction conditionnelle (`attempts < 5` ET non expiré) incrémente : au plus
  // OTP_MAX_ATTEMPTS requêtes obtiennent un essai par code, quelle que soit la concurrence.
  const claim = await prisma.otpVerification.updateMany({
    where: { id: otpRecord.id, attempts: { lt: OTP_MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  if (claim.count !== 1) {
    // Code épuisé (on le retire) ou déjà consommé / supprimé par une requête concurrente.
    await prisma.otpVerification.deleteMany({
      where: { id: otpRecord.id, attempts: { gte: OTP_MAX_ATTEMPTS } },
    });
    return { errors: { code: [GENERIC_CODE_ERROR] } };
  }

  // Comparaison en temps constant (format déjà validé).
  if (!safeEqualOtp(otpRecord.code, code)) {
    if (otpRecord.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      await prisma.otpVerification.deleteMany({ where: { id: otpRecord.id } });
    }
    return { errors: { code: [GENERIC_CODE_ERROR] } };
  }

  // Le code est valide ! Création de l'établissement et de l'utilisateur
  let generatedReference: string | undefined = undefined;

  let isPendingApproval = false;

  try {
    await prisma.$transaction(async (tx) => {
      // 0. USAGE UNIQUE : le code est consommé en premier, par identifiant. Deux requêtes
      //    parallèles avec le bon code : une seule obtient `count === 1`, l'autre est refusée
      //    (la transaction est annulée, rien n'est créé).
      const consumed = await tx.otpVerification.deleteMany({ where: { id: otpRecord.id } });
      if (consumed.count !== 1) {
        throw new EstablishmentRegistrationError(GENERIC_CODE_ERROR);
      }

      // 1. Double vérification d'unicité
      const existing = await tx.user.findUnique({
        where: { username: otpRecord.email },
        select: { id: true },
      });
      if (existing) {
        throw new EstablishmentRegistrationError(DUPLICATE_EMAIL_MESSAGE);
      }

      // 2. Vérifier les réglages de modération de la plateforme
      const shouldAutoApprove = AUTO_APPROVE_NEW_ESTABLISHMENTS;
      const status = shouldAutoApprove ? "ACTIVE" : "PENDING";
      isPendingApproval = !shouldAutoApprove;

      const establishment = await tx.establishment.create({
        data: {
          name: otpRecord.establishmentName,
          status,
          businessMode: otpRecord.businessMode,
          preferredPlanTier: otpRecord.preferredPlanTier,
          preferredBilling: otpRecord.preferredBilling,
        },
      });

      // 3. Création du compte administrateur
      const adminUser = await tx.user.create({
        data: {
          username: otpRecord.email,
          email: otpRecord.email,
          name: otpRecord.managerName,
          passwordHash: otpRecord.passwordHash,
          role: "ADMIN",
          establishmentId: establishment.id,
          isPlatformAdmin: false,
        },
        select: { id: true },
      });
      // Socle multi-espaces : sans appartenance, le compte n'aurait aucun espace (dal.ts).
      await tx.membership.create({
        data: { userId: adminUser.id, establishmentId: establishment.id, role: "ADMIN" },
      });

      // 4. Activation d'essai si auto-approuvé, ou journal d'enregistrement si modération manuelle
      if (shouldAutoApprove) {
        await createTrialSubscriptionAndAudit(
          tx,
          establishment.id,
          null,
          "ESTABLISHMENT_AUTO_APPROVED",
        );
      } else {
        await tx.auditLog.create({
          data: {
            userId: null,
            action: "ESTABLISHMENT_REGISTERED",
            entityType: "Establishment",
            entityId: establishment.id,
            newValue: {
              name: otpRecord.establishmentName,
              status: "PENDING",
              adminEmail: otpRecord.email,
              plan: otpRecord.plan,
            },
            establishmentId: establishment.id,
          },
        });
      }

      // Si l'utilisateur a choisi l'Offre Payante (9 900 FCFA / 3 mois), enregistrer la demande de paiement
      if (otpRecord.plan === "PAID_9900") {
        const pricingSettings = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
        const periodMonths = pricingSettings?.periodMonths ?? DEFAULT_PERIOD_MONTHS;
        const periodPrice = pricingSettings?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA;

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

      // 6. L'OTP a déjà été consommé à l'étape 0 (usage unique, atomique).
    });
  } catch (error) {
    if (error instanceof EstablishmentRegistrationError) {
      return { errors: { code: [error.message] } };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { code: [DUPLICATE_EMAIL_MESSAGE] } };
    }
    console.error("verifyOtpAndRegister() — échec inattendu :", error);
    return { message: t("Une erreur est survenue lors de la validation. Veuillez réessayer.") };
  }

  return {
    success: true,
    pendingApproval: isPendingApproval,
    plan: otpRecord.plan,
    establishmentName: otpRecord.establishmentName,
    reference: generatedReference,
  };
}

/**
 * Renvoie un nouveau code OTP pour un email donné
 */
export async function resendOtpCode(email: string): Promise<{ success: boolean; message?: string; testCode?: string }> {
  const t = await getT();
  const ip = await getClientIp();
  const rate = checkRateLimit(`resend-otp:${ip}`, 3, 300);
  if (!rate.allowed) {
    return { success: false, message: t("Veuillez patienter avant de demander un nouveau code.") };
  }

  // Action publique : l'argument n'est pas typé à l'exécution. Une valeur non textuelle (par
  // exemple un objet utilisé comme filtre Prisma) est refusée avant tout accès à la base.
  // Étape 2c-2 : réponse publique GÉNÉRIQUE, identique à celle d'une demande absente ou en cours.
  if (typeof email !== "string" || !email.trim()) {
    return { success: true, message: GENERIC_RESEND_MESSAGE };
  }

  // Étape 2c-2 (D7) — plafond d'ÉMISSIONS par adresse : 5 / 15 min, PARTAGÉ avec l'émission initiale
  // du code d'inscription (même clé `otp-issue:`), en plus du plafond IP. Clé normalisée (casse et
  // espaces), appliquée avant toute recherche. Limitation en mémoire du processus : locale,
  // non distribuée entre instances.
  const addressRate = checkRateLimit(`otp-issue:${email.trim().toLowerCase()}`, 5, 15 * 60);
  if (!addressRate.allowed) {
    return { success: false, message: t("Veuillez patienter avant de demander un nouveau code.") };
  }

  const existingOtp = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!existingOtp) {
    return { success: true, message: GENERIC_RESEND_MESSAGE };
  }

  const newCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Envoi AVANT remplacement : si l'e-mail ne part pas (hors environnement local
  // de test), l'ancien code reste le seul valide et aucun code n'est divulgué.
  let mailSent = false;
  try {
    const mail = await sendOtpEmail({
      to: email,
      code: newCode,
      establishmentName: existingOtp.establishmentName,
    });
    mailSent = mail.success;
  } catch (error) {
    // Une exception du service d'e-mail ne doit pas distinguer une demande en cours d'une demande absente.
    console.error("resendOtpCode() — exception lors de l'envoi de l'e-mail :", error instanceof Error ? error.name : "erreur inconnue");
  }
  const dispatch = resolveOtpDispatch({ mailSent, code: newCode, env: process.env });
  if (!dispatch.delivered) {
    // Réponse générique identique à celle d'une demande absente (aucun oracle) ; l'ancien code reste valide.
    console.error("resendOtpCode() — e-mail OTP non envoyé.");
    return { success: true, message: GENERIC_RESEND_MESSAGE };
  }

  // REMPLACEMENT du code : le nouveau code, sa validité et le compteur d'essais (0) changent dans UNE
  // seule instruction, sur la ligne identifiée. L'ancien code cesse d'être valide au même instant ;
  // les essais ne sont jamais remis à zéro pour un code conservé. Le volume total d'essais est borné
  // par les plafonds de renvoi (IP et adresse) ci-dessus, pas par ce compteur.
  const replaced = await prisma.otpVerification.updateMany({
    where: { id: existingOtp.id },
    data: {
      code: newCode,
      expiresAt,
      attempts: 0,
    },
  });
  if (replaced.count !== 1) {
    // Ligne consommée ou supprimée par une requête concurrente entre-temps : réponse générique.
    return { success: true, message: GENERIC_RESEND_MESSAGE };
  }

  return { success: true, message: GENERIC_RESEND_MESSAGE, ...(dispatch.testCode ? { testCode: dispatch.testCode } : {}) };
}
