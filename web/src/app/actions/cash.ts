"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
import { resolveDefaultCashRegister, computeTheoreticalBalance } from "@/lib/cash-data";

/**
 * Bloc 17.2, Étape D — services métier Caisse. Toutes les permissions sont
 * revérifiées ici (jamais seulement côté UI, qui n'existe d'ailleurs pas
 * encore pour ce bloc) via `getCurrentUser()` — jamais un rôle envoyé par
 * le client. `userId` provient exclusivement de la session serveur.
 */

class CashActionError extends Error {}

/**
 * Bloc 17.2 section 3.1/3.3, BLOC 12 — ouverture normale (ADMIN ou
 * GESTIONNAIRE) : `openingBalance` = dernier `physicalCount` s'il existe,
 * sinon dernier `closingTheoreticalBalance`. Première ouverture (aucune
 * session précédente) : impossible en mode normal, doit passer par `manual`.
 *
 * Ouverture manuelle exceptionnelle (`manual` fourni) : ADMIN uniquement,
 * `reason` obligatoire, `openingIsManual: true` — couvre aussi bien la
 * toute première ouverture que tout override exceptionnel ultérieur.
 */
export async function openCashSession(
  manual?: { openingBalance: number; reason: string },
): Promise<{ error?: string; id?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : aucune fonction
  // de ce fichier n'était gardée par requireActiveEstablishment(). Ouvrir une
  // nouvelle session de caisse démarre un nouveau cycle financier — gardée
  // comme une création, contrairement à closeCashSession() ci-dessous.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'ouvrir une caisse." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  if (manual && user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut ouvrir une caisse manuellement." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'ouvrir une caisse." };
  }

  let manualReason: string | undefined;
  if (manual) {
    manualReason = manual.reason?.trim();
    if (!manualReason) {
      return { error: "Une justification est obligatoire pour une ouverture manuelle." };
    }
    if (!Number.isInteger(manual.openingBalance) || manual.openingBalance < 0) {
      return { error: "Le montant d'ouverture doit être un nombre entier positif ou nul." };
    }
  }

  try {
    const session = await prisma.$transaction(
      async (tx) => {
        const register = await resolveDefaultCashRegister(tx, user.establishmentId);
        if (!register.active) {
          throw new CashActionError("Cette caisse est désactivée.");
        }

        // Bloc 17.1 section 15 — l'index unique partiel est le filet de
        // sécurité final ; cette relecture dans la transaction Serializable
        // est la première ligne de défense applicative.
        const existingOpen = await tx.cashSession.findFirst({
          where: { cashRegisterId: register.id, status: "OPEN" },
        });
        if (existingOpen) {
          throw new CashActionError("Une session de caisse est déjà ouverte.");
        }

        let openingBalance: number;
        let openingIsManual = false;
        let openingReason: string | null = null;

        if (manual) {
          openingBalance = manual.openingBalance;
          openingIsManual = true;
          openingReason = manualReason!;
        } else {
          const previous = await tx.cashSession.findFirst({
            where: { cashRegisterId: register.id, status: "CLOSED" },
            orderBy: { closedAt: "desc" },
          });
          if (!previous) {
            throw new CashActionError(
              "Aucune session précédente — la première ouverture doit être effectuée manuellement par un administrateur.",
            );
          }
          // Bloc 17.2 section 3.3 : comptage physique s'il existe, sinon solde théorique.
          openingBalance = previous.physicalCount ?? previous.closingTheoreticalBalance!;
        }

        const created = await tx.cashSession.create({
          data: {
            cashRegisterId: register.id,
            openingBalance,
            openingIsManual,
            openingReason,
            openedByUserId: user.id,
            establishmentId: user.establishmentId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: openingIsManual ? "CASH_SESSION_OPENED_MANUAL" : "CASH_SESSION_OPENED",
            entityType: "CashSession",
            entityId: created.id,
            reason: openingReason,
            oldValue: Prisma.DbNull,
            newValue: { cashRegisterId: register.id, openingBalance, openingIsManual },
            establishmentId: user.establishmentId,
          },
        });

        return created;
      },
      { isolationLevel: "Serializable" },
    );

    return { id: session.id };
  } catch (error) {
    if (error instanceof CashActionError) {
      return { error: error.message };
    }
    return { error: "Une session a peut-être été ouverte à l'instant par quelqu'un d'autre. Veuillez réessayer." };
  }
}

/**
 * BLOC 13 — calcule le solde théorique DANS la même transaction que la
 * fermeture (jamais une valeur lue avant, qui pourrait être périmée).
 * Comptage physique facultatif ; écart jamais bloquant, mais motif
 * obligatoire dès que l'écart est non nul (Bloc 17.1 décision E).
 */
export async function closeCashSession(input: {
  physicalCount?: number | null;
  varianceReason?: string | null;
  closeNote?: string | null;
}): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment() — clôturer
  // une session déjà ouverte permet de boucler proprement un cycle financier
  // en cours ; bloquer cette clôture laisserait un établissement suspendu
  // avec une caisse éternellement ouverte, jamais réconciliée. Même principe
  // que cancelReservation()/completeRental() : une action qui termine un état
  // en cours n'augmente jamais l'exposition de l'établissement.
  const user = await getCurrentUser();
  // Phase 3B / Lot B2 — résolu côté serveur depuis la session, jamais depuis
  // le navigateur ; jamais un repli sur l'établissement historique.
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de clôturer la caisse." };
  }

  const physicalCount = input.physicalCount ?? null;
  if (physicalCount !== null && (!Number.isInteger(physicalCount) || physicalCount < 0)) {
    return { error: "Le comptage physique doit être un nombre entier positif ou nul." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const register = await resolveDefaultCashRegister(tx, user.establishmentId);
        // Phase 3D / Lot D5 — `establishmentId` filtré directement sur la
        // session elle-même, en plus de son registre de rattachement : le
        // champ est la source d'autorité (déjà renseigné à la création de
        // la session, Lot B), jamais seulement supposé correct via la chaîne
        // registre → session.
        const session = await tx.cashSession.findFirst({
          where: { cashRegisterId: register.id, status: "OPEN", establishmentId: user.establishmentId },
        });
        if (!session) {
          throw new CashActionError("Aucune session de caisse ouverte.");
        }

        const closedAt = new Date();
        const closingTheoreticalBalance = await computeTheoreticalBalance(tx, { ...session, closedAt });

        let variance: number | null = null;
        let varianceReason: string | null = null;
        if (physicalCount !== null) {
          variance = physicalCount - closingTheoreticalBalance;
          if (variance !== 0) {
            varianceReason = input.varianceReason?.trim() || null;
            if (!varianceReason) {
              throw new CashActionError("Une justification est obligatoire lorsqu'un écart est constaté.");
            }
          }
        }

        // Phase 3D / Lot D5 — `updateMany` + vérification du `count` :
        // écriture finale filtrée par établissement en plus de l'id, jamais
        // seulement la vérification faite par la lecture ci-dessus.
        const result = await tx.cashSession.updateMany({
          where: { id: session.id, establishmentId: user.establishmentId },
          data: {
            status: "CLOSED",
            closingTheoreticalBalance,
            physicalCount,
            variance,
            varianceReason,
            closeNote: input.closeNote?.trim() || null,
            closedAt,
            closedByUserId: user.id,
          },
        });
        if (result.count === 0) {
          throw new CashActionError("Aucune session de caisse ouverte.");
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CASH_SESSION_CLOSED",
            entityType: "CashSession",
            entityId: session.id,
            reason: varianceReason,
            oldValue: Prisma.DbNull,
            newValue: { closingTheoreticalBalance, physicalCount, variance },
            establishmentId: user.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof CashActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant la clôture. Veuillez réessayer." };
  }

  return {};
}

/**
 * BLOC 14 — ADMIN uniquement. Modifiable : `physicalCount`/`variance`
 * (recalculé)/`varianceReason`/`closeNote`. Jamais `openingBalance`,
 * `openedAt`, `openedByUserId`, `closingTheoreticalBalance`, `closedAt`,
 * `closedByUserId`, `status` (Bloc 17.1 décision G — "ne permet pas de
 * modifier rétroactivement son solde théorique calculé").
 */
export async function modifyClosedCashSession(
  cashSessionId: string,
  changes: { physicalCount?: number | null; varianceReason?: string | null; closeNote?: string | null },
  reason: string,
): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : modifie un
  // enregistrement financier existant (correction rétroactive) — gardée
  // comme les autres actions de modification de ce lot.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette clôture." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut modifier une clôture validée." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette clôture." };
  }

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    return { error: "Une justification est obligatoire pour modifier une clôture." };
  }

  if (
    changes.physicalCount !== undefined &&
    changes.physicalCount !== null &&
    (!Number.isInteger(changes.physicalCount) || changes.physicalCount < 0)
  ) {
    return { error: "Le comptage physique doit être un nombre entier positif ou nul." };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3D / Lot D5 — gap le plus sévère identifié en Lot D1 : cette
        // lecture se contentait d'un `findUnique({id})`, contournant
        // entièrement la chaîne registre/établissement déjà en place pour
        // le reste du module caisse. `establishmentId` est un champ direct
        // de `CashSession` (renseigné une seule fois à sa création, jamais
        // modifié depuis) — l'autorité la plus fiable, plus directe qu'une
        // dérivation via `CashRegister`. Une session d'un autre établissement
        // est désormais indistinguable d'une session inexistante (même
        // message, même chemin de code).
        const existing = await tx.cashSession.findFirst({
          where: { id: cashSessionId, establishmentId: user.establishmentId },
        });
        if (!existing) {
          throw new CashActionError("Session de caisse introuvable.");
        }
        if (existing.status !== "CLOSED") {
          throw new CashActionError("Cette session n'est pas clôturée.");
        }

        const nextPhysicalCount =
          changes.physicalCount !== undefined ? changes.physicalCount : existing.physicalCount;
        const nextVariance =
          nextPhysicalCount !== null ? nextPhysicalCount - existing.closingTheoreticalBalance! : null;

        let nextVarianceReason =
          changes.varianceReason !== undefined
            ? changes.varianceReason?.trim() || null
            : existing.varianceReason;
        if (nextVariance !== null && nextVariance !== 0 && !nextVarianceReason) {
          throw new CashActionError("Une justification de l'écart est obligatoire.");
        }
        if (nextVariance === null || nextVariance === 0) {
          nextVarianceReason = changes.varianceReason !== undefined ? nextVarianceReason : existing.varianceReason;
        }

        const nextCloseNote =
          changes.closeNote !== undefined ? changes.closeNote?.trim() || null : existing.closeNote;

        // Phase 3D / Lot D5 — `updateMany` + vérification du `count` :
        // écriture finale filtrée par établissement en plus de l'id.
        const result = await tx.cashSession.updateMany({
          where: { id: cashSessionId, establishmentId: user.establishmentId },
          data: {
            physicalCount: nextPhysicalCount,
            variance: nextVariance,
            varianceReason: nextVarianceReason,
            closeNote: nextCloseNote,
          },
        });
        if (result.count === 0) {
          throw new CashActionError("Session de caisse introuvable.");
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CASH_SESSION_CLOSURE_MODIFIED",
            entityType: "CashSession",
            entityId: cashSessionId,
            reason: trimmedReason,
            oldValue: {
              physicalCount: existing.physicalCount,
              variance: existing.variance,
              varianceReason: existing.varianceReason,
              closeNote: existing.closeNote,
            },
            newValue: {
              physicalCount: nextPhysicalCount,
              variance: nextVariance,
              varianceReason: nextVarianceReason,
              closeNote: nextCloseNote,
            },
            establishmentId: user.establishmentId,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof CashActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue pendant la modification. Veuillez réessayer." };
  }

  return {};
}

/**
 * BLOC 6/15 — ADMIN uniquement, justification obligatoire, append-only.
 * Uniquement sur la session actuellement OPEN (une session déjà CLOSED a
 * son solde théorique figé — y ajouter une correction la laisserait
 * silencieusement incohérente avec un nombre qui ne sera jamais
 * recalculé, exactement ce que la décision G interdit).
 */
export async function createCashCorrection(
  amount: number,
  reason: string,
): Promise<{ error?: string; id?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que openCashSession() ci-dessus : création d'un nouvel ajustement
  // financier.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer une correction de caisse." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (user.role !== "ADMIN") {
    return { error: "Seul un administrateur peut créer une correction de caisse." };
  }
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de créer une correction de caisse." };
  }
  if (!Number.isInteger(amount) || amount === 0) {
    return { error: "Le montant de la correction doit être un nombre entier non nul." };
  }
  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    return { error: "Une justification est obligatoire pour une correction de caisse." };
  }

  try {
    const correction = await prisma.$transaction(
      async (tx) => {
        const register = await resolveDefaultCashRegister(tx, user.establishmentId);
        // Phase 3D / Lot D5, règle 8 — la session ciblée doit elle aussi
        // appartenir à l'établissement avant de créer la correction, même
        // raison que closeCashSession() ci-dessus.
        const session = await tx.cashSession.findFirst({
          where: { cashRegisterId: register.id, status: "OPEN", establishmentId: user.establishmentId },
        });
        if (!session) {
          throw new CashActionError("Aucune session de caisse ouverte.");
        }

        const created = await tx.cashCorrection.create({
          data: {
            cashSessionId: session.id,
            amount,
            reason: trimmedReason,
            userId: user.id,
            establishmentId: user.establishmentId,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CASH_CORRECTION_CREATED",
            entityType: "CashCorrection",
            entityId: created.id,
            reason: trimmedReason,
            oldValue: Prisma.DbNull,
            newValue: { cashSessionId: session.id, amount },
            establishmentId: user.establishmentId,
          },
        });

        return created;
      },
      { isolationLevel: "Serializable" },
    );
    return { id: correction.id };
  } catch (error) {
    if (error instanceof CashActionError) {
      return { error: error.message };
    }
    return { error: "Une erreur est survenue. Veuillez réessayer." };
  }
}
