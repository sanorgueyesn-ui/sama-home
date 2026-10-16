"use server";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";

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
