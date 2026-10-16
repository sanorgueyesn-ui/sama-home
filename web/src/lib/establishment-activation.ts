import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { computeDepartureTime } from "@/lib/duration";
import { DEFAULT_TRIAL_DURATION_MONTHS } from "@/lib/subscription-data";

/**
 * Phase 3G / Lot D12-P88 — logique transactionnelle PARTAGÉE entre
 * `approveEstablishment()` (approbation manuelle par un administrateur de
 * plateforme, src/app/actions/establishment-approval.ts) et
 * `registerEstablishment()` en mode automatique (inscription publique,
 * src/app/actions/establishment-registration.ts) — jamais dupliquée entre
 * les deux. Ne touche jamais `Establishment.status` elle-même : chaque
 * appelant gère sa propre transition de statut (mise à jour conditionnelle
 * `PENDING → ACTIVE` pour l'approbation manuelle ; création directe en
 * `ACTIVE` pour l'inscription automatique — les deux situations diffèrent
 * assez pour ne pas être unifiées artificiellement). Cette fonction ne fait
 * que créer l'abonnement d'essai et le journal d'audit correspondants, une
 * fois que l'appelant a déjà garanti que l'établissement est dans l'état
 * attendu.
 *
 * `actorUserId` : identifiant réel de l'administrateur de plateforme pour
 * une approbation manuelle ; `null` pour une approbation automatique
 * déclenchée par le système lui-même (aucun acteur humain réel à cet
 * instant — `AuditLog.userId` est nullable depuis ce même lot précisément
 * pour ce cas). Jamais un identifiant fabriqué pour satisfaire une
 * contrainte.
 *
 * `trialStartedAt` est TOUJOURS l'instant de l'appel (jamais
 * `Establishment.createdAt`, même pour l'auto-approbation où les deux
 * pourraient sembler coïncider à quelques millisecondes près — le calcul
 * reste indépendant). `trialDurationMonths` lu depuis `PricingSettings`
 * (configuration réelle), repli sur `DEFAULT_TRIAL_DURATION_MONTHS` (D12-P56)
 * si cette ligne n'existe pas encore. `computeDepartureTime()`
 * (src/lib/duration.ts) réutilisé tel quel, aucune réinvention.
 */
export async function createTrialSubscriptionAndAudit(
  tx: Prisma.TransactionClient,
  establishmentId: string,
  actorUserId: string | null,
  auditAction: "ESTABLISHMENT_APPROVED" | "ESTABLISHMENT_AUTO_APPROVED",
): Promise<{ trialStartedAt: Date; currentPeriodEnd: Date }> {
  const pricingSettings = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
  const trialDurationMonths = pricingSettings?.trialDurationMonths ?? DEFAULT_TRIAL_DURATION_MONTHS;
  const trialStartedAt = new Date();
  const currentPeriodEnd = computeDepartureTime(trialStartedAt, trialDurationMonths, "MONTH");

  await tx.subscription.create({
    data: { establishmentId, trialStartedAt, currentPeriodEnd },
  });

  await tx.auditLog.create({
    data: {
      userId: actorUserId,
      action: auditAction,
      entityType: "Establishment",
      entityId: establishmentId,
      reason: null,
      oldValue: { status: "PENDING" },
      newValue: { status: "ACTIVE", trialStartedAt, currentPeriodEnd },
      establishmentId,
    },
  });

  // D12-P135 — correction ciblée : ces 10 catégories étaient jusqu'ici créées
  // par `prisma/seed.ts` (seedExpenseCategories()), SANS `establishmentId`
  // (colonne ajoutée plus tard par une migration additive, jamais
  // rétro-rattachée — voir migration 20261012000000_add_multi_tenant_...,
  // confirmé par lecture exhaustive des 21 migrations : aucune ne rattache
  // ces lignes). Sur une base neuve, ces lignes restaient donc invisibles
  // pour TOUJOURS : chaque lecture de ce module (src/lib/
  // expense-categories-data.ts) filtre strictement sur `establishmentId:
  // <un id réel>`, qui ne matche jamais `null`. Déplacées ici, dans la
  // transaction PARTAGÉE entre les deux chemins d'activation d'un
  // établissement (approbation manuelle ET auto-approbation) : chaque
  // nouvel établissement reçoit désormais réellement ses 10 catégories de
  // départ, rattachées dès leur création — jamais une catégorie globale,
  // jamais un rattachement rétroactif arbitraire d'une ligne déjà
  // existante. Mêmes 10 noms/positions que l'ancien seed, aucune
  // réinvention ; `prisma/seed.ts` ne les crée plus (voir ce fichier).
  const DEFAULT_EXPENSE_CATEGORIES = [
    { name: "Loyer", position: 0 },
    { name: "Électricité", position: 1 },
    { name: "Eau", position: 2 },
    { name: "Internet", position: 3 },
    { name: "Nettoyage", position: 4 },
    { name: "Entretien", position: 5 },
    { name: "Réparation", position: 6 },
    { name: "Salaire", position: 7 },
    { name: "Achat", position: 8 },
    { name: "Autre", position: 9 },
  ] as const;
  await tx.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, active: true, establishmentId })),
  });

  return { trialStartedAt, currentPeriodEnd };
}
