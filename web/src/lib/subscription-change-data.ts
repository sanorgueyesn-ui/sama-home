import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { hasExplicitPlatformPermission } from "@/lib/permissions";
import { areRequesterAndDeciderDistinct } from "@/lib/subscription-change-rules";

/**
 * Lot 3B (B2.13-C) — LECTURE des demandes de paiement manuel et de prolongation (aucune écriture).
 *
 * Autorisation : `requirePlatformAdmin()` (session vérifiée en base ; redirige les comptes qui ne sont
 * pas administrateurs de plateforme), puis `hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")`.
 * Sans permission explicite (liste vide ou insuffisante), la fonction retourne `null` et ne lit RIEN :
 * refus par défaut. L'identité et les permissions viennent exclusivement de la session, jamais d'un
 * paramètre. Cette lecture ne remplace pas les contrôles des actions de décision, qui les refont.
 *
 * Données retournées : uniquement ce que l'interface doit afficher — jamais de mot de passe, de
 * hachage, d'identifiant du demandeur ou du décideur, d'e-mail ni de permissions. Le demandeur et le
 * décideur ne sont exposés que par leur NOM ; l'identifiant du demandeur sert seulement à calculer les
 * indicateurs côté serveur. Les textes libres (`reference`, `reason`, `decisionReason`) sont des champs
 * métier destinés aux administrateurs autorisés (l'approbateur doit voir la référence du règlement) ;
 * ils ne sont jamais copiés dans l'audit.
 */

const PENDING_STATUS = "PENDING_SECOND_APPROVAL";
const PENDING_LIMIT = 200;
const CLOSED_LIMIT = 20;

export type SubscriptionChangeKindView = "MANUAL_PAYMENT" | "PROLONGATION";
export type SubscriptionChangeStatusView = "PENDING_SECOND_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";

export type SubscriptionChangeRequestView = {
  id: string;
  kind: SubscriptionChangeKindView;
  status: SubscriptionChangeStatusView;
  establishment: { id: string; name: string };
  amountFcfa: number | null;
  periodMonths: number | null;
  days: number | null;
  reference: string | null;
  reason: string | null;
  createdAt: Date;
  /** Nom du demandeur ; `null` si son compte a été supprimé. */
  requesterName: string | null;
  /** `true` si le demandeur n'existe plus : la demande peut seulement être rejetée. */
  requesterMissing: boolean;
  /** `true` si la demande a été faite par l'utilisateur courant. */
  isOwnRequest: boolean;
  decidedByName: string | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  /**
   * `true` pour une demande en attente dont le demandeur existe encore, tant qu'aucun autre
   * administrateur disposant de la permission explicite n'existe pour la décider.
   */
  waitingForSecondAdministrator: boolean;
  /** Indicateurs d'interface, recalculés côté serveur ; les actions refont leurs propres contrôles. */
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
};

export type SubscriptionChangeOverview = {
  pending: SubscriptionChangeRequestView[];
  /** `true` si plus de demandes en attente existent que la limite affichée. */
  pendingTruncated: boolean;
  /** Les 20 demandes clôturées les plus récentes (approuvées, rejetées ou annulées). */
  recentClosed: SubscriptionChangeRequestView[];
  /** Nombre d'administrateurs de plateforme disposant de la permission explicite (utilisateur courant inclus). */
  eligibleAdministratorCount: number;
};

type RequestRow = {
  id: string;
  kind: SubscriptionChangeKindView;
  status: SubscriptionChangeStatusView;
  amountFcfa: number | null;
  periodMonths: number | null;
  days: number | null;
  reference: string | null;
  reason: string | null;
  createdAt: Date;
  requestedByUserId: string | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  establishment: { id: string; name: string };
  requestedBy: { name: string } | null;
  decidedBy: { name: string } | null;
};

// Sélection EXPLICITE et minimale : aucune colonne de `User` autre que `name`.
const REQUEST_SELECT = {
  id: true,
  kind: true,
  status: true,
  amountFcfa: true,
  periodMonths: true,
  days: true,
  reference: true,
  reason: true,
  createdAt: true,
  requestedByUserId: true,
  decidedAt: true,
  decisionReason: true,
  establishment: { select: { id: true, name: true } },
  requestedBy: { select: { name: true } },
  decidedBy: { select: { name: true } },
} as const;

/**
 * Vue des demandes pour un administrateur de plateforme autorisé, ou `null` s'il n'a pas la permission
 * explicite `PLATFORM_SUBSCRIPTIONS` (aucune donnée n'est alors lue).
 */
export async function getSubscriptionChangeOverview(): Promise<SubscriptionChangeOverview | null> {
  const user = await requirePlatformAdmin();
  if (!hasExplicitPlatformPermission(user, "PLATFORM_SUBSCRIPTIONS")) {
    return null;
  }

  const [pendingRows, closedRows, platformAdmins] = await Promise.all([
    prisma.subscriptionChangeRequest.findMany({
      where: { status: PENDING_STATUS },
      orderBy: { createdAt: "asc" },
      take: PENDING_LIMIT + 1,
      select: REQUEST_SELECT,
    }),
    prisma.subscriptionChangeRequest.findMany({
      where: { status: { not: PENDING_STATUS } },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
      take: CLOSED_LIMIT,
      select: REQUEST_SELECT,
    }),
    // Seuls l'identifiant et la liste de permissions servent à compter les décideurs possibles.
    prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true, permissions: true, isPlatformAdmin: true },
    }),
  ]);

  const eligibleIds = platformAdmins
    .filter((admin) => hasExplicitPlatformPermission(admin, "PLATFORM_SUBSCRIPTIONS"))
    .map((admin) => admin.id);

  const toView = (row: RequestRow): SubscriptionChangeRequestView => {
    const pending = row.status === PENDING_STATUS;
    const requesterMissing = row.requestedByUserId === null;
    const isOwnRequest = row.requestedByUserId === user.id;
    const otherEligible = eligibleIds.filter((id) => id !== row.requestedByUserId).length;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      establishment: { id: row.establishment.id, name: row.establishment.name },
      amountFcfa: row.amountFcfa,
      periodMonths: row.periodMonths,
      days: row.days,
      reference: row.reference,
      reason: row.reason,
      createdAt: row.createdAt,
      requesterName: row.requestedBy?.name ?? null,
      requesterMissing,
      isOwnRequest,
      decidedByName: row.decidedBy?.name ?? null,
      decidedAt: row.decidedAt,
      decisionReason: row.decisionReason,
      waitingForSecondAdministrator: pending && !requesterMissing && otherEligible === 0,
      // Demande en attente, demandeur présent et différent de l'utilisateur courant.
      canApprove: pending && !requesterMissing && areRequesterAndDeciderDistinct(row.requestedByUserId, user.id),
      // Demande en attente, demandeur absent (rejet seul) ou différent de l'utilisateur courant.
      canReject: pending && (requesterMissing || !isOwnRequest),
      // Demande en attente appartenant à l'utilisateur courant (un demandeur absent n'annule jamais).
      canCancel: pending && isOwnRequest,
    };
  };

  return {
    pending: pendingRows.slice(0, PENDING_LIMIT).map(toView),
    pendingTruncated: pendingRows.length > PENDING_LIMIT,
    recentClosed: closedRows.map(toView),
    eligibleAdministratorCount: eligibleIds.length,
  };
}
