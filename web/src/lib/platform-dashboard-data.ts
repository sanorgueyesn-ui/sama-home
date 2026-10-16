import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";

/**
 * Phase 3G / Lot D12-P86 — fenêtre "bientôt expiré" pour le tableau de bord
 * de la console de plateforme. Décision prise ici, pas une règle
 * préexistante réutilisée (aucune autre partie du projet ne définit de
 * seuil d'alerte d'expiration) — signalée explicitement plutôt que
 * silencieusement choisie, même principe que `NEW_PASSWORD_MIN` dans
 * src/lib/definitions.ts.
 */
const EXPIRING_SOON_WINDOW_DAYS = 7;

export type PlatformDashboardSummary = {
  pendingEstablishments: number;
  activeEstablishments: number;
  rejectedOrSuspendedEstablishments: number;
  pendingPayments: number;
  expiringSoonSubscriptions: number;
};

/**
 * Uniquement des comptages réels, jamais une donnée inventée ou un
 * graphique alimenté par des valeurs fictives. Re-garde elle-même via
 * requirePlatformAdmin() — même défense en profondeur que
 * listEstablishments()/listPendingSubscriptionPayments().
 */
export async function getPlatformDashboardSummary(): Promise<PlatformDashboardSummary> {
  await requirePlatformAdmin();

  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    pendingEstablishments,
    activeEstablishments,
    rejectedOrSuspendedEstablishments,
    pendingPayments,
    expiringSoonSubscriptions,
  ] = await Promise.all([
    prisma.establishment.count({ where: { status: "PENDING" } }),
    prisma.establishment.count({ where: { status: "ACTIVE" } }),
    prisma.establishment.count({ where: { status: { in: ["REJECTED", "SUSPENDED"] } } }),
    prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { currentPeriodEnd: { gte: now, lte: soon } } }),
  ]);

  return {
    pendingEstablishments,
    activeEstablishments,
    rejectedOrSuspendedEstablishments,
    pendingPayments,
    expiringSoonSubscriptions,
  };
}
