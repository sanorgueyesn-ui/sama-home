"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { hasExplicitPlatformPermission } from "@/lib/permissions";
import {
  areRequesterAndDeciderDistinct,
  validateIdempotencyKey,
  validateManualPaymentAmountFcfa,
  validateManualPaymentMonths,
  validateProlongationDays,
  validateReason,
  validateReference,
  validateRejectionReason,
  type RuleResult,
} from "@/lib/subscription-change-rules";

/**
 * Lot 3B (B2.13-A) — CRÉATION des demandes de paiement manuel et de prolongation manuelle, soumises à
 * la validation d'un SECOND administrateur de plateforme. Les actions de création n'appliquent RIEN :
 * elles ne créent ni règlement (`SubscriptionPayment`) ni abonnement, et ne prolongent aucune
 * échéance. Elles enregistrent seulement une demande en attente (`SubscriptionChangeRequest`, statut
 * `PENDING_SECOND_APPROVAL` par défaut) et son audit, dans la même transaction.
 *
 * Lot 3B (B2.13-B) — DÉCISIONS : `approveSubscriptionChange` (seule action qui applique l'effet),
 * `rejectSubscriptionChange` et `cancelSubscriptionChange`, plus bas dans ce fichier.
 *
 * Autorisation (côté serveur, indépendamment de l'interface) : session vérifiée en base par
 * `getCurrentUser()`, puis `hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")` — jamais
 * `hasPlatformPermission` (une liste de permissions vide n'accorde pas l'accès). Le demandeur est
 * EXCLUSIVEMENT l'utilisateur de la session : tout champ `requestedByUserId`, `status`, etc. envoyé par
 * le client est ignoré, car seuls les champs listés ci-dessous sont lus.
 *
 * L'établissement ciblé est un identifiant fourni par l'appelant (un administrateur de plateforme
 * cible légitimement un établissement) : il est donc vérifié en base — existant, `ACTIVE`, avec un
 * abonnement DÉJÀ existant. Aucun abonnement n'est jamais créé ici.
 *
 * Idempotence : la clé fournie par le formulaire est unique PAR DEMANDEUR (contrainte en base).
 * - même clé et même contenu normalisé : la demande existante est renvoyée (`replayed: true`), quel
 *   que soit son statut actuel, sans revalider l'état de l'établissement ;
 * - même clé et contenu différent : refus ;
 * - collision d'unicité (deux envois simultanés) : la transaction échouée n'est JAMAIS réutilisée ; la
 *   collision est interceptée HORS de la transaction, puis une lecture indépendante renvoie ou refuse
 *   selon la même comparaison. Si cette lecture ne retrouve rien, l'erreur reste une erreur.
 */

class SubscriptionChangeRequestError extends Error {}

type SubscriptionChangeCreateResult = { error?: string; requestId?: string; replayed?: boolean };

type NormalizedRequest =
  | {
      kind: "MANUAL_PAYMENT";
      establishmentId: string;
      amountFcfa: number;
      periodMonths: number;
      days: null;
      reference: string | null;
      reason: string | null;
      idempotencyKey: string;
    }
  | {
      kind: "PROLONGATION";
      establishmentId: string;
      amountFcfa: null;
      periodMonths: null;
      days: number;
      reference: null;
      reason: string | null;
      idempotencyKey: string;
    };

type ExistingRequest = {
  id: string;
  kind: string;
  establishmentId: string;
  amountFcfa: number | null;
  periodMonths: number | null;
  days: number | null;
  reference: string | null;
  reason: string | null;
};

const FORBIDDEN_MESSAGE =
  "Action refusée : vous n'avez pas l'autorisation de demander un paiement manuel ou une prolongation d'abonnement.";
const ESTABLISHMENT_NOT_FOUND_MESSAGE = "Établissement introuvable.";
const ESTABLISHMENT_NOT_ACTIVE_MESSAGE =
  "Cet établissement n'est pas actif : un paiement manuel ou une prolongation ne peut être demandé que pour un établissement actif.";
const NO_SUBSCRIPTION_MESSAGE =
  "Cet établissement n'a pas d'abonnement : aucune demande n'est possible (aucun abonnement n'est créé automatiquement).";
const IDEMPOTENCY_CONFLICT_MESSAGE =
  "Cette clé d'idempotence a déjà été utilisée pour une demande différente. Rechargez le formulaire et réessayez.";
const GENERIC_ERROR_MESSAGE = "Une erreur est survenue pendant l'enregistrement de la demande. Veuillez réessayer.";
const INVALID_INPUT_MESSAGE = "Les données de la demande sont invalides.";

const ESTABLISHMENT_ID_MAX_LENGTH = 64;

function readObject(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : null;
}

function validateEstablishmentId(value: unknown): RuleResult<string> {
  if (typeof value !== "string" || value.trim() === "" || value.length > ESTABLISHMENT_ID_MAX_LENGTH) {
    return { valid: false, error: "L'identifiant de l'établissement est invalide." };
  }
  return { valid: true, value };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

function sameContent(existing: ExistingRequest, request: NormalizedRequest): boolean {
  return (
    existing.kind === request.kind &&
    existing.establishmentId === request.establishmentId &&
    existing.amountFcfa === request.amountFcfa &&
    existing.periodMonths === request.periodMonths &&
    existing.days === request.days &&
    existing.reference === request.reference &&
    existing.reason === request.reason
  );
}

function replayOrConflict(existing: ExistingRequest, request: NormalizedRequest): SubscriptionChangeCreateResult {
  if (!sameContent(existing, request)) {
    return { error: IDEMPOTENCY_CONFLICT_MESSAGE };
  }
  return { requestId: existing.id, replayed: true };
}

async function createChangeRequest(userId: string, request: NormalizedRequest): Promise<SubscriptionChangeCreateResult> {
  try {
    const result = await prisma.$transaction(async (tx): Promise<SubscriptionChangeCreateResult> => {
      // 1. Rejeu d'une demande déjà enregistrée avec cette clé (propre à ce demandeur), avant toute
      //    vérification d'état : un rejeu ne dépend pas de l'état actuel de l'établissement.
      const existing = await tx.subscriptionChangeRequest.findUnique({
        where: { requestedByUserId_idempotencyKey: { requestedByUserId: userId, idempotencyKey: request.idempotencyKey } },
        select: {
          id: true,
          kind: true,
          establishmentId: true,
          amountFcfa: true,
          periodMonths: true,
          days: true,
          reference: true,
          reason: true,
        },
      });
      if (existing) {
        return replayOrConflict(existing, request);
      }

      // 2. État de l'établissement : existant, ACTIVE, avec un abonnement PRÉEXISTANT (lecture seule).
      const establishment = await tx.establishment.findUnique({
        where: { id: request.establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) {
        throw new SubscriptionChangeRequestError(ESTABLISHMENT_NOT_FOUND_MESSAGE);
      }
      if (establishment.status !== "ACTIVE") {
        throw new SubscriptionChangeRequestError(ESTABLISHMENT_NOT_ACTIVE_MESSAGE);
      }
      const subscription = await tx.subscription.findUnique({
        where: { establishmentId: establishment.id },
        select: { id: true },
      });
      if (!subscription) {
        throw new SubscriptionChangeRequestError(NO_SUBSCRIPTION_MESSAGE);
      }

      // 3. Création de la demande en attente (statut par défaut) et audit, dans la même transaction.
      const created = await tx.subscriptionChangeRequest.create({
        data: {
          establishmentId: establishment.id,
          kind: request.kind,
          amountFcfa: request.amountFcfa,
          periodMonths: request.periodMonths,
          days: request.days,
          reference: request.reference,
          reason: request.reason,
          idempotencyKey: request.idempotencyKey,
          requestedByUserId: userId,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "SUBSCRIPTION_CHANGE_REQUESTED",
          entityType: "SubscriptionChangeRequest",
          entityId: created.id,
          reason: null,
          // Ni référence ni motif libres dans l'audit (minimisation) : ils restent dans la demande.
          newValue:
            request.kind === "MANUAL_PAYMENT"
              ? {
                  kind: request.kind,
                  status: "PENDING_SECOND_APPROVAL",
                  amountFcfa: request.amountFcfa,
                  periodMonths: request.periodMonths,
                }
              : { kind: request.kind, status: "PENDING_SECOND_APPROVAL", days: request.days },
          establishmentId: establishment.id,
        },
      });

      return { requestId: created.id, replayed: false };
    });

    revalidatePath("/plateforme/abonnements");
    return result;
  } catch (error) {
    if (error instanceof SubscriptionChangeRequestError) {
      return { error: error.message };
    }

    if (isUniqueViolation(error)) {
      // Collision d'unicité : la transaction est échouée et n'est plus utilisée. Lecture indépendante.
      try {
        const existing = await prisma.subscriptionChangeRequest.findUnique({
          where: { requestedByUserId_idempotencyKey: { requestedByUserId: userId, idempotencyKey: request.idempotencyKey } },
          select: {
            id: true,
            kind: true,
            establishmentId: true,
            amountFcfa: true,
            periodMonths: true,
            days: true,
            reference: true,
            reason: true,
          },
        });
        if (existing) {
          const outcome = replayOrConflict(existing, request);
          if (!outcome.error) revalidatePath("/plateforme/abonnements");
          return outcome;
        }
      } catch (lookupError) {
        console.error("createChangeRequest() — relecture après collision d'unicité impossible :", lookupError);
        return { error: GENERIC_ERROR_MESSAGE };
      }
      console.error("createChangeRequest() — collision d'unicité sans demande retrouvée :", error);
      return { error: GENERIC_ERROR_MESSAGE };
    }

    console.error("createChangeRequest() — échec inattendu de la création de la demande :", error);
    return { error: GENERIC_ERROR_MESSAGE };
  }
}

/**
 * Demande de paiement manuel (règlement encaissé hors ligne). Paramètres lus : `establishmentId`,
 * `amountFcfa` (entier 100 à 10 000 000), `periodMonths` (entier 1 à 36), `reference` (facultative,
 * 200 caractères au plus), `reason` (facultatif, 500 au plus), `idempotencyKey`.
 */
export async function requestManualPayment(input: unknown): Promise<SubscriptionChangeCreateResult> {
  const user = await getCurrentUser();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: FORBIDDEN_MESSAGE };
  }

  const fields = readObject(input);
  if (!fields) return { error: INVALID_INPUT_MESSAGE };

  const establishmentId = validateEstablishmentId(fields.establishmentId);
  if (!establishmentId.valid) return { error: establishmentId.error };
  const amountFcfa = validateManualPaymentAmountFcfa(fields.amountFcfa);
  if (!amountFcfa.valid) return { error: amountFcfa.error };
  const periodMonths = validateManualPaymentMonths(fields.periodMonths);
  if (!periodMonths.valid) return { error: periodMonths.error };
  const reference = validateReference(fields.reference);
  if (!reference.valid) return { error: reference.error };
  const reason = validateReason(fields.reason);
  if (!reason.valid) return { error: reason.error };
  const idempotencyKey = validateIdempotencyKey(fields.idempotencyKey);
  if (!idempotencyKey.valid) return { error: idempotencyKey.error };

  return createChangeRequest(user.id, {
    kind: "MANUAL_PAYMENT",
    establishmentId: establishmentId.value,
    amountFcfa: amountFcfa.value,
    periodMonths: periodMonths.value,
    days: null,
    reference: reference.value,
    reason: reason.value,
    idempotencyKey: idempotencyKey.value,
  });
}

/**
 * Demande de prolongation manuelle, exprimée en jours uniquement. Paramètres lus : `establishmentId`,
 * `days` (entier 1 à 366), `reason` (facultatif, 500 au plus), `idempotencyKey`. Aucune référence :
 * un éventuel champ `reference` envoyé par le client est ignoré (toujours `NULL`).
 */
export async function requestProlongation(input: unknown): Promise<SubscriptionChangeCreateResult> {
  const user = await getCurrentUser();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: FORBIDDEN_MESSAGE };
  }

  const fields = readObject(input);
  if (!fields) return { error: INVALID_INPUT_MESSAGE };

  const establishmentId = validateEstablishmentId(fields.establishmentId);
  if (!establishmentId.valid) return { error: establishmentId.error };
  const days = validateProlongationDays(fields.days);
  if (!days.valid) return { error: days.error };
  const reason = validateReason(fields.reason);
  if (!reason.valid) return { error: reason.error };
  const idempotencyKey = validateIdempotencyKey(fields.idempotencyKey);
  if (!idempotencyKey.valid) return { error: idempotencyKey.error };

  return createChangeRequest(user.id, {
    kind: "PROLONGATION",
    establishmentId: establishmentId.value,
    amountFcfa: null,
    periodMonths: null,
    days: days.value,
    reference: null,
    reason: reason.value,
    idempotencyKey: idempotencyKey.value,
  });
}

// ---------------------------------------------------------------------------------------------
// Lot 3B (B2.13-B) — décisions sur une demande : approbation, rejet, annulation
// ---------------------------------------------------------------------------------------------

type SubscriptionChangeDecisionResult = { error?: string; requestId?: string };

const FORBIDDEN_DECISION_MESSAGE =
  "Action refusée : vous n'avez pas l'autorisation de décider des demandes de paiement manuel ou de prolongation d'abonnement.";
const REQUEST_NOT_FOUND_MESSAGE = "Demande introuvable.";
const REQUEST_ID_INVALID_MESSAGE = "L'identifiant de la demande est invalide.";
const DECIDED_CONCURRENTLY_MESSAGE =
  "Cette demande vient d'être traitée par quelqu'un d'autre à l'instant. Rechargez et réessayez.";
const SUBSCRIPTION_CHANGED_MESSAGE =
  "L'abonnement a été modifié entre-temps par une autre opération. Rechargez et réessayez.";
const NO_REQUESTER_MESSAGE =
  "Cette demande n'a plus de demandeur : elle ne peut pas être approuvée. Elle peut être rejetée avec un motif.";
const SELF_APPROVAL_MESSAGE = "Vous ne pouvez pas approuver votre propre demande : un autre administrateur doit le faire.";
const SELF_REJECTION_MESSAGE =
  "Vous ne pouvez pas rejeter votre propre demande : un autre administrateur doit le faire. Vous pouvez l'annuler.";
const NOT_REQUESTER_MESSAGE = "Seul le demandeur peut annuler sa propre demande.";
const REQUESTER_GONE_CANCEL_MESSAGE = "Cette demande n'a plus de demandeur : elle ne peut pas être annulée.";
const INVALID_FROZEN_VALUES_MESSAGE = "Cette demande contient des valeurs invalides : approbation refusée.";
const APPROVAL_ERROR_MESSAGE = "Une erreur est survenue pendant l'approbation. Veuillez réessayer.";
const REJECTION_ERROR_MESSAGE = "Une erreur est survenue pendant le rejet. Veuillez réessayer.";
const CANCELLATION_ERROR_MESSAGE = "Une erreur est survenue pendant l'annulation. Veuillez réessayer.";
// Référence historique d'un règlement saisi sans justificatif (inchangée depuis l'ancienne action).
const DEFAULT_MANUAL_PAYMENT_REFERENCE = "Paiement direct (Saisie Admin)";
const PENDING_STATUS = "PENDING_SECOND_APPROVAL";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function validateRequestId(value: unknown): RuleResult<string> {
  if (typeof value !== "string" || value.trim() === "" || value.length > ESTABLISHMENT_ID_MAX_LENGTH) {
    return { valid: false, error: REQUEST_ID_INVALID_MESSAGE };
  }
  return { valid: true, value };
}

function alreadyProcessedMessage(status: string): string {
  return `Cette demande a déjà été traitée (statut actuel : ${status}).`;
}

/**
 * Approbation par un SECOND administrateur. Seule action qui applique l'effet d'une demande.
 *
 * Une seule transaction : (1) lecture et contrôles (statut, demandeur présent et distinct,
 * établissement ACTIVE, abonnement existant, valeurs gelées revalidées) ; (2) pour un paiement manuel,
 * création d'un NOUVEAU règlement confirmé (jamais de modification d'un règlement existant) ;
 * (3) mise à jour CONDITIONNELLE de la demande — `WHERE id, status = PENDING_SECOND_APPROVAL,
 * requestedByUserId <> approbateur` (la comparaison `<>` n'est jamais vraie pour un demandeur NULL) —
 * qui écrit statut, décideur, date et `appliedPaymentId` en une seule instruction (contrainte
 * `applied_payment_check`) ; `count !== 1` annule TOUTE la transaction, règlement compris ;
 * (4) prolongation de l'abonnement par verrou optimiste sur l'échéance lue (même mécanisme que
 * `confirmSubscriptionPayment`) : `count !== 1` annule tout ; (5) audits dans la transaction.
 * L'isolation par défaut suffit ici car chaque écriture critique est une mise à jour conditionnelle
 * qui attend le verrou de ligne puis réévalue sa condition. Aucun abonnement n'est jamais créé.
 */
export async function approveSubscriptionChange(input: unknown): Promise<SubscriptionChangeDecisionResult> {
  const user = await getCurrentUser();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: FORBIDDEN_DECISION_MESSAGE };
  }

  const fields = readObject(input);
  if (!fields) return { error: INVALID_INPUT_MESSAGE };
  const requestId = validateRequestId(fields.requestId);
  if (!requestId.valid) return { error: requestId.error };

  try {
    const result = await prisma.$transaction(async (tx): Promise<SubscriptionChangeDecisionResult> => {
      const request = await tx.subscriptionChangeRequest.findUnique({
        where: { id: requestId.value },
        select: {
          id: true,
          kind: true,
          status: true,
          establishmentId: true,
          amountFcfa: true,
          periodMonths: true,
          days: true,
          reference: true,
          requestedByUserId: true,
        },
      });
      if (!request) throw new SubscriptionChangeRequestError(REQUEST_NOT_FOUND_MESSAGE);
      if (request.status !== PENDING_STATUS) {
        throw new SubscriptionChangeRequestError(alreadyProcessedMessage(request.status));
      }
      if (request.requestedByUserId === null) {
        throw new SubscriptionChangeRequestError(NO_REQUESTER_MESSAGE);
      }
      if (!areRequesterAndDeciderDistinct(request.requestedByUserId, user.id)) {
        throw new SubscriptionChangeRequestError(SELF_APPROVAL_MESSAGE);
      }

      const establishment = await tx.establishment.findUnique({
        where: { id: request.establishmentId },
        select: { id: true, status: true },
      });
      if (!establishment) throw new SubscriptionChangeRequestError(ESTABLISHMENT_NOT_FOUND_MESSAGE);
      if (establishment.status !== "ACTIVE") throw new SubscriptionChangeRequestError(ESTABLISHMENT_NOT_ACTIVE_MESSAGE);
      const subscription = await tx.subscription.findUnique({
        where: { establishmentId: establishment.id },
        select: { id: true, currentPeriodEnd: true },
      });
      if (!subscription) throw new SubscriptionChangeRequestError(NO_SUBSCRIPTION_MESSAGE);

      // Revalidation des valeurs gelées par les règles pures (la base les contraint aussi).
      let frozen:
        | { kind: "MANUAL_PAYMENT"; amountFcfa: number; periodMonths: number }
        | { kind: "PROLONGATION"; days: number };
      if (request.kind === "MANUAL_PAYMENT") {
        const amount = validateManualPaymentAmountFcfa(request.amountFcfa);
        const months = validateManualPaymentMonths(request.periodMonths);
        if (!amount.valid || !months.valid || request.days !== null) {
          throw new SubscriptionChangeRequestError(INVALID_FROZEN_VALUES_MESSAGE);
        }
        frozen = { kind: "MANUAL_PAYMENT", amountFcfa: amount.value, periodMonths: months.value };
      } else if (request.kind === "PROLONGATION") {
        const days = validateProlongationDays(request.days);
        if (!days.valid || request.amountFcfa !== null || request.periodMonths !== null) {
          throw new SubscriptionChangeRequestError(INVALID_FROZEN_VALUES_MESSAGE);
        }
        frozen = { kind: "PROLONGATION", days: days.value };
      } else {
        throw new SubscriptionChangeRequestError(INVALID_FROZEN_VALUES_MESSAGE);
      }

      // Point de départ : l'échéance si elle est dans le futur, sinon l'instant présent (comme
      // `confirmSubscriptionPayment`). Mois calendaires pour un paiement, jours de 24 h pour une prolongation.
      const now = new Date();
      const anchor = subscription.currentPeriodEnd.getTime() > now.getTime() ? subscription.currentPeriodEnd : now;
      const newPeriodEnd =
        frozen.kind === "MANUAL_PAYMENT"
          ? computeDepartureTime(anchor, frozen.periodMonths, "MONTH")
          : new Date(anchor.getTime() + frozen.days * DAY_IN_MS);

      // Nouveau règlement confirmé (paiement manuel uniquement) : annulé avec la transaction si la suite échoue.
      let paymentId: string | null = null;
      if (frozen.kind === "MANUAL_PAYMENT") {
        const payment = await tx.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount: frozen.amountFcfa,
            periodMonths: frozen.periodMonths,
            reference: request.reference ?? DEFAULT_MANUAL_PAYMENT_REFERENCE,
            status: "CONFIRMED",
            confirmedByUserId: user.id,
            confirmedAt: now,
            periodStartedAt: anchor,
            periodEndedAt: newPeriodEnd,
          },
          select: { id: true },
        });
        paymentId = payment.id;
      }

      // Décision unique : conditionnée au statut, à un demandeur présent et différent de l'approbateur.
      const decided = await tx.subscriptionChangeRequest.updateMany({
        where: { id: request.id, status: PENDING_STATUS, requestedByUserId: { not: user.id } },
        data: {
          status: "APPROVED",
          decidedByUserId: user.id,
          decidedAt: now,
          ...(paymentId !== null ? { appliedPaymentId: paymentId } : {}),
        },
      });
      if (decided.count !== 1) throw new SubscriptionChangeRequestError(DECIDED_CONCURRENTLY_MESSAGE);

      // Prolongation : verrou optimiste sur l'échéance lue (aucune perte de mise à jour concurrente).
      const extended = await tx.subscription.updateMany({
        where: { id: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd },
        data: { currentPeriodEnd: newPeriodEnd },
      });
      if (extended.count !== 1) throw new SubscriptionChangeRequestError(SUBSCRIPTION_CHANGED_MESSAGE);

      // Audits : l'audit métier historique de l'effet, puis l'audit de la décision. Ni référence ni
      // motif libres dans les journaux (ils restent dans la demande et le règlement).
      if (frozen.kind === "MANUAL_PAYMENT" && paymentId !== null) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED",
            entityType: "SubscriptionPayment",
            entityId: paymentId,
            reason: `Règlement manuel confirmé de ${frozen.amountFcfa} FCFA (${frozen.periodMonths} mois)`,
            oldValue: { currentPeriodEnd: subscription.currentPeriodEnd },
            newValue: {
              status: "CONFIRMED",
              amount: frozen.amountFcfa,
              periodMonths: frozen.periodMonths,
              currentPeriodEnd: newPeriodEnd,
            },
            establishmentId: establishment.id,
          },
        });
      } else if (frozen.kind === "PROLONGATION") {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "SUBSCRIPTION_PROLONGED",
            entityType: "Subscription",
            entityId: subscription.id,
            reason: `Prolongation manuelle de ${frozen.days} jours (demande approuvée)`,
            oldValue: { currentPeriodEnd: subscription.currentPeriodEnd },
            newValue: { currentPeriodEnd: newPeriodEnd, daysAdded: frozen.days },
            establishmentId: establishment.id,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_CHANGE_APPROVED",
          entityType: "SubscriptionChangeRequest",
          entityId: request.id,
          reason: null,
          oldValue: { status: PENDING_STATUS },
          newValue: { status: "APPROVED", kind: frozen.kind, appliedPaymentId: paymentId },
          establishmentId: establishment.id,
        },
      });

      return { requestId: request.id };
    });

    revalidatePath("/plateforme/abonnements");
    return result;
  } catch (error) {
    if (error instanceof SubscriptionChangeRequestError) return { error: error.message };
    console.error("approveSubscriptionChange() — échec inattendu de l'approbation :", error);
    return { error: APPROVAL_ERROR_MESSAGE };
  }
}

/**
 * Rejet par un autre administrateur, avec un motif OBLIGATOIRE (conservé dans `decisionReason`, pas
 * dans l'audit). Le demandeur ne peut pas rejeter sa propre demande (il peut l'annuler). Exception :
 * une demande dont le demandeur est NULL (compte supprimé) peut être rejetée par tout administrateur
 * autorisé — jamais approuvée ni annulée.
 */
export async function rejectSubscriptionChange(input: unknown): Promise<SubscriptionChangeDecisionResult> {
  const user = await getCurrentUser();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: FORBIDDEN_DECISION_MESSAGE };
  }

  const fields = readObject(input);
  if (!fields) return { error: INVALID_INPUT_MESSAGE };
  const requestId = validateRequestId(fields.requestId);
  if (!requestId.valid) return { error: requestId.error };
  const reason = validateRejectionReason(fields.reason);
  if (!reason.valid) return { error: reason.error };

  try {
    const result = await prisma.$transaction(async (tx): Promise<SubscriptionChangeDecisionResult> => {
      const request = await tx.subscriptionChangeRequest.findUnique({
        where: { id: requestId.value },
        select: { id: true, kind: true, status: true, establishmentId: true, requestedByUserId: true },
      });
      if (!request) throw new SubscriptionChangeRequestError(REQUEST_NOT_FOUND_MESSAGE);
      if (request.status !== PENDING_STATUS) {
        throw new SubscriptionChangeRequestError(alreadyProcessedMessage(request.status));
      }
      if (request.requestedByUserId === user.id) {
        throw new SubscriptionChangeRequestError(SELF_REJECTION_MESSAGE);
      }

      const decided = await tx.subscriptionChangeRequest.updateMany({
        where: {
          id: request.id,
          status: PENDING_STATUS,
          // `<>` n'est jamais vrai pour NULL : le cas « demandeur supprimé » doit être listé explicitement.
          OR: [{ requestedByUserId: null }, { requestedByUserId: { not: user.id } }],
        },
        data: { status: "REJECTED", decidedByUserId: user.id, decidedAt: new Date(), decisionReason: reason.value },
      });
      if (decided.count !== 1) throw new SubscriptionChangeRequestError(DECIDED_CONCURRENTLY_MESSAGE);

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_CHANGE_REJECTED",
          entityType: "SubscriptionChangeRequest",
          entityId: request.id,
          reason: null,
          oldValue: { status: PENDING_STATUS },
          newValue: { status: "REJECTED", kind: request.kind },
          establishmentId: request.establishmentId,
        },
      });

      return { requestId: request.id };
    });

    revalidatePath("/plateforme/abonnements");
    return result;
  } catch (error) {
    if (error instanceof SubscriptionChangeRequestError) return { error: error.message };
    console.error("rejectSubscriptionChange() — échec inattendu du rejet :", error);
    return { error: REJECTION_ERROR_MESSAGE };
  }
}

/**
 * Annulation par le demandeur de sa propre demande, tant qu'elle est en attente. Une demande dont le
 * demandeur est NULL ne peut être annulée par personne (elle peut être rejetée). Le motif est
 * facultatif.
 */
export async function cancelSubscriptionChange(input: unknown): Promise<SubscriptionChangeDecisionResult> {
  const user = await getCurrentUser();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: FORBIDDEN_DECISION_MESSAGE };
  }

  const fields = readObject(input);
  if (!fields) return { error: INVALID_INPUT_MESSAGE };
  const requestId = validateRequestId(fields.requestId);
  if (!requestId.valid) return { error: requestId.error };
  const reason = validateReason(fields.reason);
  if (!reason.valid) return { error: reason.error };

  try {
    const result = await prisma.$transaction(async (tx): Promise<SubscriptionChangeDecisionResult> => {
      const request = await tx.subscriptionChangeRequest.findUnique({
        where: { id: requestId.value },
        select: { id: true, kind: true, status: true, establishmentId: true, requestedByUserId: true },
      });
      if (!request) throw new SubscriptionChangeRequestError(REQUEST_NOT_FOUND_MESSAGE);
      if (request.status !== PENDING_STATUS) {
        throw new SubscriptionChangeRequestError(alreadyProcessedMessage(request.status));
      }
      if (request.requestedByUserId === null) {
        throw new SubscriptionChangeRequestError(REQUESTER_GONE_CANCEL_MESSAGE);
      }
      if (request.requestedByUserId !== user.id) {
        throw new SubscriptionChangeRequestError(NOT_REQUESTER_MESSAGE);
      }

      const decided = await tx.subscriptionChangeRequest.updateMany({
        where: { id: request.id, status: PENDING_STATUS, requestedByUserId: user.id },
        data: { status: "CANCELLED", decidedByUserId: user.id, decidedAt: new Date(), decisionReason: reason.value },
      });
      if (decided.count !== 1) throw new SubscriptionChangeRequestError(DECIDED_CONCURRENTLY_MESSAGE);

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_CHANGE_CANCELLED",
          entityType: "SubscriptionChangeRequest",
          entityId: request.id,
          reason: null,
          oldValue: { status: PENDING_STATUS },
          newValue: { status: "CANCELLED", kind: request.kind },
          establishmentId: request.establishmentId,
        },
      });

      return { requestId: request.id };
    });

    revalidatePath("/plateforme/abonnements");
    return result;
  } catch (error) {
    if (error instanceof SubscriptionChangeRequestError) return { error: error.message };
    console.error("cancelSubscriptionChange() — échec inattendu de l'annulation :", error);
    return { error: CANCELLATION_ERROR_MESSAGE };
  }
}
