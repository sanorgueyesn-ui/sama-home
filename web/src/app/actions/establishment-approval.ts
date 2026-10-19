"use server";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";
import { verifyPassword } from "@/lib/password";
import { hasPlatformPermission } from "@/lib/permissions";

class EstablishmentApprovalError extends Error {}

/**
 * Phase 3G / Lot D12-P82 — approbation/refus d'un établissement `PENDING`
 * par un administrateur de PLATEFORME. Autorisation stricte via
 * `requirePlatformAdmin()` (même garde que `confirmSubscriptionPayment()`,
 * D12-P59) — jamais `role === "ADMIN"` d'établissement. Le seul identifiant
 * reçu du client est `establishmentId` (et `reason` pour le refus) —
 * aucune autre valeur d'autorité (statut, dates d'abonnement, identité de
 * l'approbateur) n'est jamais acceptée depuis l'appelant.
 *
 * Concurrence — même mécanisme déjà établi et vérifié pour
 * `confirmSubscriptionPayment()` : `updateMany` filtré sur `status:
 * "PENDING"`, jamais une lecture suivie d'une écriture séparée sans ce
 * filtre. Un établissement n'a par construction qu'une seule ligne
 * `Establishment` (clé primaire) : deux décisions concurrentes sur le même
 * `establishmentId` ne peuvent jamais produire qu'une seule transition
 * effective, l'autre étant rejetée par `count === 0`.
 *
 * Abonnement d'essai — créé UNIQUEMENT ici, à l'approbation, jamais à
 * l'inscription (voir le commentaire du modèle `Subscription`,
 * schema.prisma) : `trialStartedAt` est TOUJOURS l'instant de
 * l'approbation, jamais `Establishment.createdAt`. `trialDurationMonths`
 * lu depuis `PricingSettings` (configuration réelle) ; la valeur par défaut
 * déjà établie en D12-P56 (`DEFAULT_TRIAL_DURATION_MONTHS`, jamais
 * redéfinie ici) n'est utilisée que si cette ligne n'existe pas encore.
 * `computeDepartureTime()` (src/lib/duration.ts) réutilisé tel quel pour
 * l'arithmétique calendaire — déjà utilisé pour
 * `confirmSubscriptionPayment()`, aucune réinvention.
 *
 * Aucune notification créée dans ce lot (décision produit explicitement
 * actée) — aucun e-mail n'est jamais présenté comme envoyé.
 */
export async function approveEstablishment(establishmentId: string): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, "PLATFORM_ESTABLISHMENTS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation d'approuver les établissements." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Vérification d'existence et de statut.
      const establishment = await tx.establishment.findUnique({
        where: { id: establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) {
        throw new EstablishmentApprovalError("Établissement introuvable.");
      }
      if (establishment.status !== "PENDING") {
        throw new EstablishmentApprovalError(
          `Cet établissement a déjà été traité (statut actuel : ${establishment.status}).`,
        );
      }

      // 2. Mise à jour conditionnelle sur id + status encore PENDING —
      // seule garantie réelle contre une double décision concurrente.
      const result = await tx.establishment.updateMany({
        where: { id: establishmentId, status: "PENDING" },
        data: { status: "ACTIVE" },
      });
      if (result.count === 0) {
        throw new EstablishmentApprovalError(
          "Cet établissement vient d'être traité par quelqu'un d'autre à l'instant. Rechargez et réessayez.",
        );
      }

      // 3/4/5. Abonnement d'essai + journal d'audit — logique PARTAGÉE avec
      // l'auto-approbation à l'inscription (Lot D12-P88), jamais dupliquée
      // (voir src/lib/establishment-activation.ts). `user.id` réel transmis
      // ici (approbation humaine), jamais `null`.
      await createTrialSubscriptionAndAudit(tx, establishmentId, user.id, "ESTABLISHMENT_APPROVED");
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`approveEstablishment(${establishmentId}) — échec inattendu de l'approbation :`, error);
    return { error: "Une erreur est survenue pendant l'approbation. Veuillez réessayer." };
  }

  return {};
}

export async function rejectEstablishment(establishmentId: string, reason: string): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, "PLATFORM_ESTABLISHMENTS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de refuser les établissements." };
  }

  // Motif obligatoire, texte non blanc — vérifié avant toute connexion à la
  // logique de décision elle-même, jamais une validation uniquement côté
  // client.
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "Un motif de refus est obligatoire." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.findUnique({
        where: { id: establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) {
        throw new EstablishmentApprovalError("Établissement introuvable.");
      }
      if (establishment.status !== "PENDING") {
        throw new EstablishmentApprovalError(
          `Cet établissement a déjà été traité (statut actuel : ${establishment.status}).`,
        );
      }

      const result = await tx.establishment.updateMany({
        where: { id: establishmentId, status: "PENDING" },
        data: { status: "REJECTED" },
      });
      if (result.count === 0) {
        throw new EstablishmentApprovalError(
          "Cet établissement vient d'être traité par quelqu'un d'autre à l'instant. Rechargez et réessayez.",
        );
      }

      // Établissement et administrateur initial jamais supprimés — seul le
      // statut change.
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ESTABLISHMENT_REJECTED",
          entityType: "Establishment",
          entityId: establishmentId,
          reason: trimmedReason,
          oldValue: { status: "PENDING" },
          newValue: { status: "REJECTED" },
          establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`rejectEstablishment(${establishmentId}) — échec inattendu du refus :`, error);
    return { error: "Une erreur est survenue pendant le refus. Veuillez réessayer." };
  }

  return {};
}

/**
 * Phase 3G / Lot D12-P92 — suspension d'un établissement `ACTIVE` par un
 * administrateur de PLATEFORME. Même structure et même garantie de
 * concurrence que approveEstablishment()/rejectEstablishment() ci-dessus :
 * `updateMany` filtré sur `id` + `status: "ACTIVE"` encore valide au moment
 * de l'écriture, jamais une lecture suivie d'une écriture séparée sans ce
 * filtre — deux suspensions concurrentes (ou une suspension et toute autre
 * transition) sur le même établissement ne peuvent jamais produire qu'une
 * seule transition effective.
 *
 * Ne touche JAMAIS `Subscription` : la suspension est un axe indépendant du
 * statut d'abonnement (voir le commentaire de `EstablishmentStatus.SUSPENDED`
 * dans schema.prisma), et aucune donnée métier de l'établissement ou de ses
 * utilisateurs n'est jamais supprimée (seul `Establishment.status` change).
 */
export async function suspendEstablishment(establishmentId: string): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, "PLATFORM_ESTABLISHMENTS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de suspendre les établissements." };
  }

  if (!establishmentId) {
    return { error: "Identifiant d'établissement manquant." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.findUnique({
        where: { id: establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) {
        throw new EstablishmentApprovalError("Établissement introuvable.");
      }
      if (establishment.status !== "ACTIVE") {
        throw new EstablishmentApprovalError(
          `Seul un établissement actif peut être suspendu (statut actuel : ${establishment.status}).`,
        );
      }

      const result = await tx.establishment.updateMany({
        where: { id: establishmentId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
      if (result.count === 0) {
        throw new EstablishmentApprovalError(
          "Cet établissement vient d'être modifié par quelqu'un d'autre à l'instant. Rechargez et réessayez.",
        );
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ESTABLISHMENT_SUSPENDED",
          entityType: "Establishment",
          entityId: establishmentId,
          reason: null,
          oldValue: { status: "ACTIVE" },
          newValue: { status: "SUSPENDED" },
          establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`suspendEstablishment(${establishmentId}) — échec inattendu de la suspension :`, error);
    return { error: "Une erreur est survenue pendant la suspension. Veuillez réessayer." };
  }

  return {};
}

/**
 * Phase 3G / Lot D12-P92 — réactivation d'un établissement `SUSPENDED`
 * (jamais `REJECTED` — aucun chemin de ce statut vers `ACTIVE` n'existe nulle
 * part dans ce fichier, par construction : le filtre `status: "SUSPENDED"`
 * ci-dessous exclut structurellement ce cas). Même garantie de concurrence
 * que les fonctions ci-dessus.
 *
 * Ne modifie JAMAIS `Subscription` — en particulier, ne recalcule ni ne
 * prolonge jamais `currentPeriodEnd` : un abonnement déjà expiré au moment
 * de la réactivation reste expiré, et `requireActiveEstablishment()`
 * (src/lib/dal.ts) continuera de bloquer l'accès métier indépendamment de
 * ce changement de statut (les deux vérifications — statut de
 * l'établissement, puis statut de l'abonnement — restent strictement
 * séparées, jamais fusionnées ni contournées ici).
 */
export async function reactivateEstablishment(establishmentId: string): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, "PLATFORM_ESTABLISHMENTS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de réactiver les établissements." };
  }

  if (!establishmentId) {
    return { error: "Identifiant d'établissement manquant." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.findUnique({
        where: { id: establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) {
        throw new EstablishmentApprovalError("Établissement introuvable.");
      }
      if (establishment.status !== "SUSPENDED") {
        throw new EstablishmentApprovalError(
          `Seul un établissement suspendu peut être réactivé (statut actuel : ${establishment.status}).`,
        );
      }

      const result = await tx.establishment.updateMany({
        where: { id: establishmentId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });
      if (result.count === 0) {
        throw new EstablishmentApprovalError(
          "Cet établissement vient d'être modifié par quelqu'un d'autre à l'instant. Rechargez et réessayez.",
        );
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ESTABLISHMENT_REACTIVATED",
          entityType: "Establishment",
          entityId: establishmentId,
          reason: null,
          oldValue: { status: "SUSPENDED" },
          newValue: { status: "ACTIVE" },
          establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`reactivateEstablishment(${establishmentId}) — échec inattendu de la réactivation :`, error);
    return { error: "Une erreur est survenue pendant la réactivation. Veuillez réessayer." };
  }

  return {};
}

/**
 * Suppression définitive d'un établissement et de TOUTES ses données associées
 * par un administrateur de PLATEFORME, sécurisée par mot de passe administrateur.
 */
export async function deleteEstablishment(
  establishmentId: string,
  adminPassword?: string
): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, "PLATFORM_ESTABLISHMENTS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de supprimer les établissements." };
  }

  if (!establishmentId) {
    return { error: "Identifiant d'établissement manquant." };
  }
  if (!adminPassword || typeof adminPassword !== "string" || !adminPassword.trim()) {
    return { error: "Veuillez saisir votre mot de passe administrateur pour confirmer la suppression." };
  }

  const currentAdmin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const isPasswordValid = await verifyPassword(adminPassword.trim(), currentAdmin?.passwordHash ?? null);
  if (!isPasswordValid) {
    return { error: "Mot de passe administrateur incorrect. Suppression refusée." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const establishment = await tx.establishment.findUnique({
        where: { id: establishmentId },
        select: { id: true, name: true },
      });
      if (!establishment) {
        throw new EstablishmentApprovalError("Établissement introuvable.");
      }

      // 1. Notifications & lectures
      await tx.notificationRead.deleteMany({
        where: { user: { establishmentId } },
      });
      await tx.notification.deleteMany({
        where: { relatedEstablishmentId: establishmentId },
      });

      // 2. Opérations de caisse et banque
      await tx.cashCorrection.deleteMany({
        where: { establishmentId },
      });
      await tx.cashSession.deleteMany({
        where: { establishmentId },
      });
      await tx.cashRegister.deleteMany({
        where: { establishmentId },
      });
      await tx.bankTransfer.deleteMany({
        where: { establishmentId },
      });
      await tx.transferSchedule.deleteMany({
        where: { establishmentId },
      });
      await tx.bankAccount.deleteMany({
        where: { establishmentId },
      });

      // 3. Dépenses et catégories
      await tx.expense.deleteMany({
        where: { establishmentId },
      });
      await tx.expenseCategory.deleteMany({
        where: { establishmentId },
      });

      // 4. Paiements, locations et réservations
      await tx.payment.deleteMany({
        where: { establishmentId },
      });
      await tx.rentalExtension.deleteMany({
        where: { establishmentId },
      });
      await tx.rental.deleteMany({
        where: { establishmentId },
      });
      await tx.reservation.deleteMany({
        where: { establishmentId },
      });

      // 5. Tarifs, logements et clients
      await tx.tariff.deleteMany({
        where: { establishmentId },
      });
      await tx.property.deleteMany({
        where: { establishmentId },
      });
      await tx.client.deleteMany({
        where: { establishmentId },
      });

      // 6. Abonnements et paiements d'abonnement
      await tx.subscriptionPayment.deleteMany({
        where: { subscription: { establishmentId } },
      });
      await tx.subscription.deleteMany({
        where: { establishmentId },
      });

      // 7. Paramètres et sessions
      await tx.settings.deleteMany({
        where: { establishmentId },
      });
      await tx.session.deleteMany({
        where: { user: { establishmentId } },
      });

      // 8. Journaux d'audit liés à l'établissement ou à ses utilisateurs
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { establishmentId },
            { user: { establishmentId } },
          ],
        },
      });

      // 9. Utilisateurs de l'établissement
      await tx.user.deleteMany({
        where: { establishmentId },
      });

      // 10. Enfin, suppression de l'établissement
      await tx.establishment.delete({
        where: { id: establishmentId },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ESTABLISHMENT_DELETED",
          entityType: "Establishment",
          entityId: establishmentId,
          reason: `Suppression définitive de l'établissement « ${establishment.name} »`,
          oldValue: { name: establishment.name },
          newValue: { deleted: true },
          establishmentId: null,
        },
      });
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`deleteEstablishment(${establishmentId}) — échec de la suppression :`, error);
    return { error: "Une erreur est survenue pendant la suppression. Veuillez réessayer." };
  }

  return {};
}

/**
 * Suppression d'un compte utilisateur individuel par un administrateur de PLATEFORME,
 * sécurisée par mot de passe administrateur.
 */
export async function deletePlatformUser(
  targetUserId: string,
  adminPassword?: string
): Promise<{ error?: string }> {
  const currentAdminUser = await requirePlatformAdmin();

  if (!targetUserId) {
    return { error: "Identifiant utilisateur manquant." };
  }
  if (targetUserId === currentAdminUser.id) {
    return { error: "Impossible de supprimer votre propre compte administrateur connecté." };
  }
  if (!adminPassword || typeof adminPassword !== "string" || !adminPassword.trim()) {
    return { error: "Veuillez saisir votre mot de passe administrateur pour confirmer la suppression." };
  }

  const currentAdmin = await prisma.user.findUnique({
    where: { id: currentAdminUser.id },
    select: { passwordHash: true },
  });
  const isPasswordValid = await verifyPassword(adminPassword.trim(), currentAdmin?.passwordHash ?? null);
  if (!isPasswordValid) {
    return { error: "Mot de passe administrateur incorrect. Suppression refusée." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, username: true, isPlatformAdmin: true, establishmentId: true },
      });
      if (!target) {
        throw new EstablishmentApprovalError("Utilisateur introuvable.");
      }
      if (target.isPlatformAdmin) {
        throw new EstablishmentApprovalError("Impossible de supprimer un compte administrateur de plateforme.");
      }

      // Supprimer sessions et notifications de lecture de cet utilisateur
      await tx.session.deleteMany({ where: { userId: targetUserId } });
      await tx.notificationRead.deleteMany({ where: { userId: targetUserId } });
      await tx.auditLog.deleteMany({ where: { userId: targetUserId } });

      // Suppression de l'utilisateur
      await tx.user.delete({ where: { id: targetUserId } });

      await tx.auditLog.create({
        data: {
          userId: currentAdminUser.id,
          action: "USER_DELETED",
          entityType: "User",
          entityId: targetUserId,
          reason: `Suppression définitive du compte utilisateur « ${target.name} » (${target.username})`,
          oldValue: { name: target.name, username: target.username },
          newValue: { deleted: true },
          establishmentId: target.establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof EstablishmentApprovalError) {
      return { error: error.message };
    }
    console.error(`deletePlatformUser(${targetUserId}) — échec :`, error);
    return { error: "Une erreur est survenue pendant la suppression du compte. Veuillez réessayer." };
  }

  return {};
}


