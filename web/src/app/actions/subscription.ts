"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/subscription-data";
import { computeDepartureTime } from "@/lib/duration";
import { hasPlatformPermission } from "@/lib/permissions";

class SubscriptionPaymentRequestError extends Error {}
class SubscriptionPaymentConfirmationError extends Error {}

/**
 * Phase 3G / Lot D12-P57 — demande de renouvellement d'abonnement, créée
 * avec le statut `PENDING` uniquement. Aucune confirmation, aucune
 * prolongation de `Subscription.currentPeriodEnd` ici — cette fonction ne
 * fait QUE déposer la demande ; la confirmation (réservée à un
 * administrateur de plateforme, `isPlatformAdmin === true`, jamais
 * `role === "ADMIN"` d'un établissement — les deux ne sont jamais confondus,
 * voir le commentaire sur `model User` dans schema.prisma) sera une action
 * séparée développée dans un lot ultérieur. `requireActiveEstablishment()`
 * n'est délibérément PAS utilisée ici : cette fonction doit au contraire
 * rester utilisable précisément quand l'abonnement est expiré/absent (sinon
 * un établissement bloqué ne pourrait jamais demander son propre
 * renouvellement) — seule une authentification + un rôle d'établissement
 * valide sont exigés, jamais le statut de l'abonnement lui-même.
 *
 * Doublons/concurrence — examen du schéma réel avant ce lot : `Subscription`
 * est `@unique` sur `establishmentId` (une seule ligne par établissement),
 * mais `SubscriptionPayment` n'a AUCUNE contrainte d'unicité sur
 * (subscriptionId, status) ni sur quoi que ce soit d'autre au-delà de sa clé
 * primaire — confirmé par lecture directe de schema.prisma, jamais supposé.
 * Rien ne garantit donc l'unicité au niveau base. La protection ci-dessous
 * (vérification + création dans une transaction Serializable) repose sur le
 * même mécanisme déjà vérifié empiriquement dans ce projet
 * (createTariff/createExpenseCategory, Lot D12-P37/P49) : PostgreSQL
 * SERIALIZABLE détecte un conflit d'écriture concurrente entre une lecture
 * et une écriture qui en dépend, même sans contrainte dédiée — mais ce n'est
 * PAS une garantie d'unicité au niveau base (un INSERT direct hors
 * transaction Serializable, ou une future voie d'écriture qui ne passerait
 * pas par cette fonction, ne serait pas protégé). Si une garantie absolue
 * est requise, une contrainte d'unicité partielle (`CREATE UNIQUE INDEX ...
 * WHERE status = 'PENDING'`) serait la solution minimale propre — hors
 * périmètre de ce lot (aucune migration autorisée ici), signalée dans le
 * rapport plutôt qu'implémentée.
 *
 * Comme toute demande `PENDING` pour un même abonnement utilise forcément le
 * même montant/durée (`PricingSettings`, source unique et globale — jamais
 * choisie par l'appelant), bloquer TOUTE demande `PENDING` déjà existante
 * pour cet abonnement équivaut exactement à bloquer une demande
 * "identique" : il ne peut pas exister de demande `PENDING` non-identique
 * pour le même abonnement à un instant donné.
 */
export async function createSubscriptionPaymentRequest(
  reference?: string,
): Promise<{ error?: string }> {
  // 1. Session vérifiée côté serveur (jamais le cookie seul) — `verifySession()`
  //    est appelée en interne par `getCurrentUser()`.
  // 2. `establishmentId` résolu exclusivement depuis l'utilisateur authentifié
  //    — jamais un paramètre reçu du client.
  const user = await getCurrentUser();

  // 4. Compte sans établissement refusé.
  if (!user.establishmentId) {
    return {
      error: "Votre compte n'est rattaché à aucun établissement — impossible de créer une demande de renouvellement.",
    };
  }
  // 3. Seuls les rôles d'établissement ADMIN et GESTIONNAIRE sont autorisés
  //    — jamais `user.isPlatformAdmin`, qui est un booléen distinct et n'a
  //    aucune autorité ici (un compte de plateforme n'a d'ailleurs aucun
  //    établissement, donc serait déjà refusé ci-dessus dans tous les cas
  //    réels, mais ce contrôle explicite ne dépend jamais de cette
  //    coïncidence).
  if (user.role !== "ADMIN" && user.role !== "GESTIONNAIRE") {
    return {
      error: "Seuls un administrateur ou un gestionnaire de l'établissement peuvent initier un renouvellement.",
    };
  }
  const establishmentId = user.establishmentId;

  // 5. Abonnement de CET établissement uniquement — `Subscription` est
  //    `@unique` sur `establishmentId`, même mécanisme que
  //    requireActiveEstablishment() dans dal.ts (non appelée ici, voir
  //    commentaire ci-dessus, mais même principe d'isolation).
  const subscription = await prisma.subscription.findUnique({
    where: { establishmentId },
    select: { id: true },
  });
  if (!subscription) {
    return {
      error: "Aucun abonnement n'est configuré pour cet établissement — contactez un administrateur de plateforme.",
    };
  }

  // 6. Tarification lue depuis PricingSettings (configuration réelle) ; les
  //    valeurs par défaut ne sont utilisées QUE si cette ligne n'existe pas
  //    encore — mêmes constantes que la page de statut (D12-P56), jamais
  //    redéfinies ici.
  const pricingSettings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  const periodMonths = pricingSettings?.periodMonths ?? DEFAULT_PERIOD_MONTHS;
  const amount = pricingSettings?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA;

  // Justificatif libre, jamais un numéro de carte ni un secret (même
  // convention que le commentaire du champ dans schema.prisma) — vide
  // normalisé en `null`, jamais une chaîne vide stockée.
  const trimmedReference = reference?.trim();

  try {
    await prisma.$transaction(
      async (tx) => {
        // 7/9 — aucune confirmation, aucune date de période payée, aucune
        // prolongation de `currentPeriodEnd` : uniquement `status: "PENDING"`
        // et les champs renseignés "à la confirmation uniquement" du schéma
        // (periodStartedAt/periodEndedAt/confirmedByUserId/confirmedAt)
        // restent tous absents ici.
        const existingPending = await tx.subscriptionPayment.findFirst({
          where: { subscriptionId: subscription.id, status: "PENDING" },
        });
        if (existingPending) {
          throw new SubscriptionPaymentRequestError(
            "Une demande de renouvellement est déjà en attente de confirmation pour cet établissement.",
          );
        }

        const created = await tx.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount,
            periodMonths,
            status: "PENDING",
            reference: trimmedReference || null,
          },
        });

        // Convention déjà établie pour les actions à caractère financier
        // dans ce projet (bank.ts/cash.ts/expense-categories.ts/rentals.ts) —
        // reprise ici pour une demande de paiement d'abonnement, qui relève
        // de la même catégorie.
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "SUBSCRIPTION_PAYMENT_REQUESTED",
            entityType: "SubscriptionPayment",
            entityId: created.id,
            reason: null,
            oldValue: Prisma.DbNull,
            newValue: { amount: created.amount, periodMonths: created.periodMonths, status: created.status },
            establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof SubscriptionPaymentRequestError) {
      return { error: error.message };
    }
    // P2034 = conflit d'écriture/sérialisation Postgres sous isolation
    // Serializable — jamais confondu avec P2002 (violation d'une contrainte
    // d'unicité, qui n'existe d'ailleurs pas ici, voir le commentaire en tête
    // de fonction).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return {
        error: "Une demande vient peut-être d'être créée à l'instant par quelqu'un d'autre. Veuillez vérifier et réessayer.",
      };
    }
    console.error("createSubscriptionPaymentRequest() — échec inattendu de la création de la demande :", error);
    return { error: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  return {};
}

/**
 * Phase 3G / Lot D12-P59 — confirmation d'une demande `PENDING` par un
 * administrateur de PLATEFORME, et prolongation atomique de l'abonnement
 * correspondant. Autorisation stricte sur `user.isPlatformAdmin === true`
 * UNIQUEMENT — jamais `user.role === "ADMIN"` (un ADMIN d'établissement,
 * même du même établissement que la demande, est refusé ici ; les deux
 * notions ne sont jamais fusionnées, voir le commentaire sur `model User`
 * dans schema.prisma). Le seul identifiant reçu du client est `paymentId` —
 * l'abonnement et l'établissement cibles sont résolus EXCLUSIVEMENT via la
 * relation `SubscriptionPayment.subscription` enregistrée en base, jamais
 * depuis une valeur fournie par l'appelant.
 *
 * Règle de calcul des dates — recherchée dans le projet avant ce lot
 * (`src/lib/duration.ts`, déjà utilisée pour `advanceNextRunAt()` dans
 * bank.ts) : addition calendaire de mois, bornée au dernier jour du mois
 * cible (ex. 31 janvier + 1 mois -> 28/29 février, jamais mars) — réutilisée
 * ici telle quelle via `computeDepartureTime(ancre, periodMonths, "MONTH")`,
 * aucune réinvention.
 *
 * Point d'ancrage si l'abonnement est déjà EXPIRÉ au moment de la
 * confirmation : AUCUNE règle existante dans ce projet ne répondait à cette
 * question avant ce lot (schema.prisma, dal.ts et tout le code existant ont
 * été relus et ne la couvrent pas) — l'analogie la plus proche
 * (`advanceNextRunAt()`, qui ancre toujours sur l'échéance précédente,
 * jamais sur `now`) a été examinée puis écartée : appliquée telle quelle
 * ici, elle pourrait produire un `currentPeriodEnd` DÉJÀ DANS LE PASSÉ dès
 * sa création si la confirmation tarde plus longtemps que `periodMonths`
 * (un client payant se retrouverait immédiatement re-expiré). Décision
 * produit explicitement demandée et confirmée pour ce lot (D12-P59) : ancrer
 * depuis l'instant de la confirmation (`now`) dans ce cas précis — jamais
 * depuis l'ancienne date d'expiration.
 *
 * Concurrence — conformément à la convention DÉJÀ DOCUMENTÉE dans le
 * commentaire du modèle `SubscriptionPayment` (schema.prisma) : protection
 * par `updateMany` filtré sur `status: "PENDING"` (même mécanisme que
 * updateSettings()/saveBrandColors() — jamais une lecture suivie d'une
 * écriture séparée). Pas de transaction Serializable ici : contrairement à
 * createSubscriptionPaymentRequest()/createTariff() (qui protègent la
 * création d'une NOUVELLE ligne, sans verrou naturel possible), cette
 * fonction modifie une ligne EXISTANTE identifiée par son id — le filtre
 * `WHERE status = 'PENDING'` d'un `updateMany` est déjà, à lui seul,
 * correctement sérialisé par le verrouillage de ligne Postgres standard
 * (READ COMMITTED suffit), sans néologisme ni hypothèse nouvelle. Un second
 * `updateMany` optimiste (filtré sur l'ancien `currentPeriodEnd` lu dans la
 * même transaction) protège en plus contre le cas, plus rare mais possible
 * puisque createSubscriptionPaymentRequest() ne garantit pas une unicité
 * absolue au niveau base, de deux demandes `PENDING` distinctes du MÊME
 * abonnement confirmées concurremment.
 */
export async function confirmSubscriptionPayment(paymentId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();

  // Jamais `user.role === "ADMIN"` comme preuve d'administration de
  // plateforme — booléen distinct, vérifié seul.
  if (!user.isPlatformAdmin || !hasPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de confirmer les paiements d'abonnement." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 3. Chargement de la demande et de son abonnement associé, dans la
      //    même transaction que les vérifications et les écritures.
      const payment = await tx.subscriptionPayment.findUnique({
        where: { id: paymentId },
        include: { subscription: true },
      });
      if (!payment) {
        throw new SubscriptionPaymentConfirmationError("Demande de paiement introuvable.");
      }
      if (payment.status !== "PENDING") {
        throw new SubscriptionPaymentConfirmationError(
          `Cette demande a déjà été traitée (statut actuel : ${payment.status}).`,
        );
      }
      // `onDelete: Restrict` garantit déjà cette relation en pratique —
      // vérifié explicitement ici quand même, défense en profondeur demandée
      // explicitement par ce lot, même principe que les autres narrowings
      // redondants déjà présents dans ce projet.
      if (!payment.subscription) {
        throw new SubscriptionPaymentConfirmationError("Abonnement associé introuvable.");
      }
      if (!(payment.periodMonths > 0)) {
        throw new SubscriptionPaymentConfirmationError("Durée de période invalide sur cette demande — confirmation refusée.");
      }
      if (!(payment.amount > 0)) {
        throw new SubscriptionPaymentConfirmationError("Montant invalide sur cette demande — confirmation refusée.");
      }

      const subscription = payment.subscription;
      const anchor = subscription.currentPeriodEnd.getTime() > now.getTime() ? subscription.currentPeriodEnd : now;
      const newPeriodEnd = computeDepartureTime(anchor, payment.periodMonths, "MONTH");

      // 5. Passage à CONFIRMED + 4. periodStartedAt/periodEndedAt — un seul
      // `updateMany`, filtré sur le statut encore PENDING : si quelqu'un
      // d'autre a déjà traité cette même demande entre notre lecture et
      // cette écriture, `count === 0`, jamais un écrasement silencieux.
      const paymentResult = await tx.subscriptionPayment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
          confirmedByUserId: user.id,
          periodStartedAt: anchor,
          periodEndedAt: newPeriodEnd,
        },
      });
      if (paymentResult.count === 0) {
        throw new SubscriptionPaymentConfirmationError(
          "Cette demande vient d'être traitée par quelqu'un d'autre à l'instant. Rechargez et réessayez.",
        );
      }

      // 6. Prolongation — verrou optimiste sur l'ancienne valeur déjà lue
      // (même principe que `updatedAt` dans updateSettings()) : si une autre
      // demande PENDING du même abonnement a été confirmée entre-temps,
      // `count === 0`.
      const subscriptionResult = await tx.subscription.updateMany({
        where: { id: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd },
        data: { currentPeriodEnd: newPeriodEnd },
      });
      if (subscriptionResult.count === 0) {
        throw new SubscriptionPaymentConfirmationError(
          "L'abonnement a été prolongé entre-temps par une autre confirmation. Rechargez et réessayez.",
        );
      }

      // 7. Journal d'audit — même convention que les mises à jour
      // financières existantes (bank.ts) : oldValue/newValue en objets
      // simples, jamais Prisma.DbNull (réservé aux créations sans état
      // antérieur, voir createSubscriptionPaymentRequest() ci-dessus).
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_PAYMENT_CONFIRMED",
          entityType: "SubscriptionPayment",
          entityId: paymentId,
          reason: null,
          oldValue: { status: "PENDING", currentPeriodEnd: subscription.currentPeriodEnd },
          newValue: { status: "CONFIRMED", currentPeriodEnd: newPeriodEnd, periodStartedAt: anchor, periodEndedAt: newPeriodEnd },
          establishmentId: subscription.establishmentId,
        },
      });
    });
  } catch (error) {
    if (error instanceof SubscriptionPaymentConfirmationError) {
      return { error: error.message };
    }
    console.error(`confirmSubscriptionPayment(${paymentId}) — échec inattendu de la confirmation :`, error);
    return { error: "Une erreur est survenue pendant la confirmation. Veuillez réessayer." };
  }

  return {};
}

/**
 * Prolongation manuelle d'un abonnement par un administrateur de plateforme.
 * Permet d'ajouter des jours directement (ex: geste commercial, régularisation, etc.).
 */
export async function prolongSubscriptionAction(
  establishmentId: string,
  days: number,
  reason?: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin || !hasPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation de prolonger un abonnement." };
  }

  if (!days || days <= 0) {
    return { error: "La durée de prolongation doit être supérieure à zéro jour." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      let subscription = await tx.subscription.findUnique({
        where: { establishmentId },
      });

      if (!subscription) {
        const anchor = now;
        const newPeriodEnd = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
        subscription = await tx.subscription.create({
          data: {
            establishmentId,
            trialStartedAt: now,
            currentPeriodEnd: newPeriodEnd,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "SUBSCRIPTION_PROLONGED",
            entityType: "Subscription",
            entityId: subscription.id,
            reason: reason || `Création et activation manuelle (+${days} jours)`,
            oldValue: Prisma.JsonNull,
            newValue: { currentPeriodEnd: newPeriodEnd, daysAdded: days },
            establishmentId,
          },
        });
        return;
      }

      const anchor = subscription.currentPeriodEnd.getTime() > now.getTime() ? subscription.currentPeriodEnd : now;
      const newPeriodEnd = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { currentPeriodEnd: newPeriodEnd },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_PROLONGED",
          entityType: "Subscription",
          entityId: subscription.id,
          reason: reason || `Prolongation manuelle de ${days} jours par l'administrateur`,
          oldValue: { currentPeriodEnd: subscription.currentPeriodEnd },
          newValue: { currentPeriodEnd: newPeriodEnd, daysAdded: days },
          establishmentId,
        },
      });
    });
  } catch (error) {
    console.error(`prolongSubscriptionAction(${establishmentId}, ${days}) error:`, error);
    return { error: "Une erreur est survenue lors de la prolongation de l'abonnement." };
  }

  return {};
}

/**
 * Enregistrement manuel d'un règlement d'abonnement (Wave, Orange Money, Espèces, Virement)
 * par un administrateur de plateforme.
 */
export async function recordManualSubscriptionPaymentAction(
  establishmentId: string,
  amount: number,
  periodMonths: number,
  reference?: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin || !hasPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return { error: "Action refusée : vous n'avez pas l'autorisation d'enregistrer un paiement d'abonnement." };
  }

  if (!amount || amount <= 0) {
    return { error: "Le montant du paiement doit être supérieur à zéro FCFA." };
  }
  if (!periodMonths || periodMonths <= 0) {
    return { error: "La durée en mois doit être d'au moins 1 mois." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      let subscription = await tx.subscription.findUnique({
        where: { establishmentId },
      });

      if (!subscription) {
        subscription = await tx.subscription.create({
          data: {
            establishmentId,
            trialStartedAt: now,
            currentPeriodEnd: now,
          },
        });
      }

      const anchor = subscription.currentPeriodEnd.getTime() > now.getTime() ? subscription.currentPeriodEnd : now;
      const newPeriodEnd = computeDepartureTime(anchor, periodMonths, "MONTH");

      const payment = await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount,
          periodMonths,
          reference: reference?.trim() || "Paiement direct (Saisie Admin)",
          status: "CONFIRMED",
          confirmedByUserId: user.id,
          confirmedAt: now,
          periodStartedAt: anchor,
          periodEndedAt: newPeriodEnd,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { currentPeriodEnd: newPeriodEnd },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED",
          entityType: "SubscriptionPayment",
          entityId: payment.id,
          reason: `Règlement manuel confirmé de ${amount} FCFA (${periodMonths} mois)`,
          oldValue: { currentPeriodEnd: subscription.currentPeriodEnd },
          newValue: {
            status: "CONFIRMED",
            amount,
            periodMonths,
            currentPeriodEnd: newPeriodEnd,
            reference: reference || null,
          },
          establishmentId,
        },
      });
    });
  } catch (error) {
    console.error(`recordManualSubscriptionPaymentAction(${establishmentId}) error:`, error);
    return { error: "Une erreur est survenue lors de l'enregistrement du paiement." };
  }

  return {};
}

