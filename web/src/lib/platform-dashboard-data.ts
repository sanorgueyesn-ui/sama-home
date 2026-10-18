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
  totalEstablishments: number;
  totalUsers: number;
  totalProperties: number;
  totalRevenueFcfa: number;
  recentEstablishments: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    adminName: string | null;
    adminEmail: string | null;
    currentPeriodEnd: Date | null;
  }[];
  recentDecisions: {
    id: string;
    action: string;
    createdAt: Date;
    establishmentName: string | null;
    actorName: string | null;
    isSystemAction: boolean;
  }[];
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
    totalEstablishments,
    totalUsers,
    totalProperties,
  ] = await Promise.all([
    prisma.establishment.count({ where: { status: "PENDING" } }),
    prisma.establishment.count({ where: { status: "ACTIVE" } }),
    prisma.establishment.count({ where: { status: { in: ["REJECTED", "SUSPENDED"] } } }),
    prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { currentPeriodEnd: { gte: now, lte: soon } } }),
    prisma.establishment.count(),
    prisma.user.count(),
    prisma.property.count(),
  ]);

  const [confirmedPayments, recentEstablishmentsRaw, recentAuditsRaw] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      where: { status: "CONFIRMED" },
      select: { amount: true },
    }),
    prisma.establishment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        users: { where: { role: "ADMIN" }, take: 1, select: { name: true, email: true, username: true } },
        subscription: { select: { currentPeriodEnd: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        createdAt: true,
        establishmentId: true,
        user: { select: { name: true, username: true } },
      },
    }),
  ]);

  const totalRevenueFcfa = confirmedPayments.reduce((acc: number, p: { amount: number }) => acc + p.amount, 0);

  type RecentAuditItem = {
    id: string;
    action: string;
    createdAt: Date;
    establishmentId: string | null;
    user: { name: string; username: string } | null;
  };

  const typedAudits = recentAuditsRaw as RecentAuditItem[];
  const establishmentIds = typedAudits.map((a) => a.establishmentId).filter(Boolean) as string[];
  const establishmentsMap = new Map<string, string>();
  if (establishmentIds.length > 0) {
    const ests = await prisma.establishment.findMany({
      where: { id: { in: establishmentIds } },
      select: { id: true, name: true },
    });
    ests.forEach((e: { id: string; name: string }) => establishmentsMap.set(e.id, e.name));
  }

  type RecentEstablishmentItem = {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    users: { name: string; email: string | null; username: string }[];
    subscription: { currentPeriodEnd: Date } | null;
  };

  const typedEstablishments = recentEstablishmentsRaw as RecentEstablishmentItem[];
  const recentEstablishments = typedEstablishments.map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    createdAt: e.createdAt,
    adminName: e.users[0]?.name ?? null,
    adminEmail: e.users[0]?.email ?? e.users[0]?.username ?? null,
    currentPeriodEnd: e.subscription?.currentPeriodEnd ?? null,
  }));

  const recentDecisions = typedAudits.map((a) => ({
    id: a.id,
    action: a.action,
    createdAt: a.createdAt,
    establishmentName: a.establishmentId ? establishmentsMap.get(a.establishmentId) ?? null : null,
    actorName: a.user?.name ?? a.user?.username ?? null,
    isSystemAction: !a.user,
  }));

  return {
    pendingEstablishments,
    activeEstablishments,
    rejectedOrSuspendedEstablishments,
    pendingPayments,
    expiringSoonSubscriptions,
    totalEstablishments,
    totalUsers,
    totalProperties,
    totalRevenueFcfa,
    recentEstablishments,
    recentDecisions,
  };
}

