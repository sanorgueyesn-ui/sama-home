"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/password";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";
import {
  EstablishmentRegistrationSchema,
  type EstablishmentRegistrationFormState,
} from "@/lib/definitions";

class EstablishmentRegistrationError extends Error {}

const DUPLICATE_EMAIL_MESSAGE = "Un compte existe déjà avec cette adresse e-mail.";

/**
 * Phase 3G / Lot D12-P78 — inscription publique d'un établissement
 * (`/register`). Crée l'établissement en statut `PENDING` et son premier
 * compte `ADMIN`, tous deux dans la même transaction (réussite ou échec
 * ensemble) — ne crée JAMAIS d'abonnement ici (voir le commentaire du
 * modèle `Subscription`, schema.prisma : "créé UNIQUEMENT au moment de
 * l'approbation... jamais à l'inscription"). L'approbation/le rejet d'un
 * établissement PENDING par un administrateur de plateforme est un lot
 * séparé, non développé ici.
 *
 * Aucune valeur d'autorité n'est acceptée du client : `status` toujours
 * "PENDING" en dur, `role` toujours "ADMIN" en dur, `isPlatformAdmin`
 * toujours `false` en dur, `establishmentId` toujours celui de
 * l'établissement créé dans CETTE même transaction — jamais une valeur
 * reçue du formulaire (qui ne contient d'ailleurs aucun de ces champs).
 *
 * Doublons — `User.username` porte une contrainte `@unique` RÉELLE au
 * niveau base (contrairement à `Tariff`/`SubscriptionPayment` audités dans
 * des lots antérieurs, qui n'en ont aucune) : une vérification préalable
 * (`findUnique`) donne un message clair dans le cas normal, et la
 * contrainte d'unicité elle-même (capturée via `P2002`) reste l'autorité
 * finale en cas d'inscriptions concurrentes avec la même adresse — jamais
 * une transaction Serializable ici, qui serait superflue : une contrainte
 * réelle existe déjà, contrairement aux cas où Serializable a été
 * nécessaire par le passé dans ce projet.
 *
 * Décision produit confirmée pour ce lot : aucun champ "identifiant"
 * séparé dans la maquette — l'adresse e-mail soumise sert à la fois de
 * `username` (connexion) et de `email` (notifications, déjà prévu par le
 * schéma), jamais deux valeurs indépendantes inventées.
 *
 * Aucune session créée automatiquement (aucun comportement existant ni
 * décision produit explicite ne le prévoit) — l'établissement étant
 * `PENDING`, une connexion immédiate n'offrirait de toute façon aucun
 * accès aux fonctionnalités métier (`requireActiveEstablishment()` le
 * bloquerait immédiatement).
 *
 * Phase 3G / Lot D12-P88 — mode d'approbation automatique : le réglage
 * global `PlatformSettings.autoApproveEstablishments` est lu à
 * l'INTÉRIEUR de cette même transaction (jamais mis en cache avant),
 * exactement comme `PricingSettings` l'est déjà dans
 * `createTrialSubscriptionAndAudit()`. Si actif, l'établissement est créé
 * DIRECTEMENT en `status: "ACTIVE"` (jamais un `PENDING` intermédiaire
 * validé puis transitionné — aucun observateur externe ne peut jamais
 * constater un état `PENDING` pour cet établissement), et son abonnement
 * d'essai est créé dans la MÊME transaction via la logique PARTAGÉE avec
 * l'approbation manuelle (`createTrialSubscriptionAndAudit()`,
 * src/lib/establishment-activation.ts) — `actorUserId: null` (action
 * publique, non authentifiée, aucun administrateur de plateforme réel à
 * cet instant ; voir le commentaire de `AuditLog.userId` dans
 * schema.prisma). Si le réglage est inactif ou absent, comportement
 * strictement identique à avant (`status: "PENDING"`, aucun abonnement).
 * Basculer ce réglage ne modifie jamais un établissement déjà créé —
 * cette lecture n'intervient qu'à la création, jamais rétroactivement.
 */
export async function registerEstablishment(
  _prevState: EstablishmentRegistrationFormState,
  formData: FormData,
): Promise<EstablishmentRegistrationFormState> {
  const parsed = EstablishmentRegistrationSchema.safeParse({
    establishmentName: formData.get("establishmentName"),
    managerName: formData.get("managerName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { establishmentName, managerName, email, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      // Vérification préalable — message clair dans le cas normal (pas de
      // course concurrente). La contrainte @unique de la base reste
      // l'autorité finale, capturée ci-dessous via P2002.
      const existing = await tx.user.findUnique({ where: { username: email }, select: { id: true } });
      if (existing) {
        throw new EstablishmentRegistrationError(DUPLICATE_EMAIL_MESSAGE);
      }

      const platformSettings = await tx.platformSettings.findUnique({ where: { id: "singleton" } });
      const autoApprove = platformSettings?.autoApproveEstablishments ?? false;

      const establishment = await tx.establishment.create({
        data: { name: establishmentName, status: autoApprove ? "ACTIVE" : "PENDING" },
      });

      await tx.user.create({
        data: {
          username: email,
          email,
          name: managerName,
          passwordHash,
          role: "ADMIN",
          establishmentId: establishment.id,
          isPlatformAdmin: false,
        },
      });

      if (autoApprove) {
        await createTrialSubscriptionAndAudit(tx, establishment.id, null, "ESTABLISHMENT_AUTO_APPROVED");
      }
    });
  } catch (error) {
    if (error instanceof EstablishmentRegistrationError) {
      return { errors: { email: [error.message] } };
    }
    // Course concurrente sur la même adresse e-mail, non interceptée par la
    // vérification préalable ci-dessus — la contrainte @unique de
    // `User.username` reste l'autorité finale.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { email: [DUPLICATE_EMAIL_MESSAGE] } };
    }
    console.error("registerEstablishment() — échec inattendu de l'inscription :", error);
    return { message: "Une erreur est survenue pendant l'inscription. Veuillez réessayer." };
  }

  return { success: true };
}
