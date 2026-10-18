import "server-only";
import { prisma } from "@/lib/prisma";
import type { EstablishmentStatus } from "@/generated/prisma/client";
import { requirePlatformAdmin } from "@/lib/dal";

/**
 * Phase 3G / Lot D12-P56 — valeurs par défaut utilisées UNIQUEMENT si aucune
 * ligne `PricingSettings` n'existe encore en base. Ce ne sont pas des
 * nombres inventés pour ce lot : ce sont, caractère pour caractère, les
 * mêmes valeurs déjà écrites comme `@default(...)` sur `PricingSettings`
 * dans schema.prisma (trialDurationMonths: 2, periodMonths: 3,
 * periodPriceFcfa: 9900) — reprises ici pour que l'affichage reste correct
 * même avant toute création de cette ligne singleton, sans jamais écrire en
 * base depuis une page de lecture.
 */
export const DEFAULT_TRIAL_DURATION_MONTHS = 2;
export const DEFAULT_PERIOD_MONTHS = 3;
export const DEFAULT_PERIOD_PRICE_FCFA = 9900;

export type SubscriptionStatusView = {
  establishmentStatus: EstablishmentStatus | null;
  hasSubscription: boolean;
  trialStartedAt: Date | null;
  currentPeriodEnd: Date | null;
  isExpired: boolean;
  /**
   * Phase 3G / Lot D12-P58 — demande `SubscriptionPayment` la plus récente
   * au statut `PENDING` pour l'abonnement de CET établissement uniquement
   * (jamais celle d'un autre). `null` si aucune n'existe. Lecture strictement
   * additive : ne garantit aucune unicité (voir le commentaire de
   * createSubscriptionPaymentRequest(), src/app/actions/subscription.ts,
   * sur l'absence de contrainte d'unicité réelle) — sert uniquement à
   * l'affichage, jamais à une décision d'autorisation.
   */
  pendingPaymentRequest: { amount: number; periodMonths: number; createdAt: Date } | null;
  pricing: {
    trialDurationMonths: number;
    periodMonths: number;
    periodPriceFcfa: number;
    isConfigured: boolean;
  };
};

/**
 * Phase 3G / Lot D12-P56 — lecture dédiée à la page de statut
 * d'abonnement (`/abonnement`), volontairement indépendante de
 * `requireActiveEstablishment()` (dal.ts) : cette dernière sert à BLOQUER
 * une mutation métier, jamais à afficher un statut — la page de statut doit
 * au contraire rester consultable quel que soit ce même statut. Aucune
 * modification de dal.ts, aucun couplage entre les deux.
 *
 * `establishmentId` doit provenir exclusivement de `getCurrentUser()` côté
 * appelant (jamais du client) — cette fonction ne fait que lire, elle ne
 * résout ni ne vérifie elle-même l'identité de l'appelant.
 */
export async function getSubscriptionStatus(establishmentId: string): Promise<SubscriptionStatusView> {
  const [establishment, subscription, pricingSettings] = await Promise.all([
    prisma.establishment.findUnique({
      where: { id: establishmentId },
      select: { status: true },
    }),
    prisma.subscription.findUnique({
      where: { establishmentId },
      select: { id: true, trialStartedAt: true, currentPeriodEnd: true },
    }),
    prisma.pricingSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  // Dépend de `subscription.id` (résolu ci-dessus, déjà filtré par
  // `establishmentId`) — ne peut donc jamais lire la demande d'un autre
  // établissement. `undefined` (pas de ligne) si aucun abonnement n'existe.
  const pendingPaymentRequest = subscription
    ? await prisma.subscriptionPayment.findFirst({
        where: { subscriptionId: subscription.id, status: "PENDING" },
        select: { amount: true, periodMonths: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return {
    establishmentStatus: establishment?.status ?? null,
    hasSubscription: Boolean(subscription),
    trialStartedAt: subscription?.trialStartedAt ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    isExpired: subscription ? subscription.currentPeriodEnd.getTime() <= Date.now() : false,
    pendingPaymentRequest: pendingPaymentRequest ?? null,
    pricing: pricingSettings
      ? {
          trialDurationMonths: pricingSettings.trialDurationMonths,
          periodMonths: pricingSettings.periodMonths,
          periodPriceFcfa: pricingSettings.periodPriceFcfa,
          isConfigured: true,
        }
      : {
          trialDurationMonths: DEFAULT_TRIAL_DURATION_MONTHS,
          periodMonths: DEFAULT_PERIOD_MONTHS,
          periodPriceFcfa: DEFAULT_PERIOD_PRICE_FCFA,
          isConfigured: false,
        },
  };
}

export type PendingSubscriptionPaymentView = {
  id: string;
  establishmentName: string;
  createdAt: Date;
  amount: number;
  periodMonths: number;
  reference: string | null;
};

/**
 * Phase 3G / Lot D12-P60 — liste des demandes `SubscriptionPayment` au
 * statut `PENDING`, toutes établissements confondus (vue réservée à un
 * administrateur de PLATEFORME, jamais à un compte d'établissement — voir
 * requirePlatformAdmin(), dal.ts). Re-garde elle-même via
 * requirePlatformAdmin(), même principe de défense en profondeur que
 * listUsers() (users-data.ts) avec requireAdmin() : ne repose jamais
 * uniquement sur le fait que la page appelante l'ait déjà vérifié.
 *
 * La requête est filtrée côté serveur sur `status: "PENDING"` exactement —
 * aucun autre statut ne peut jamais apparaître dans le résultat, aucun
 * paramètre d'appel ne permet de l'élargir.
 */
export async function listPendingSubscriptionPayments(): Promise<PendingSubscriptionPaymentView[]> {
  await requirePlatformAdmin();

  const payments = await prisma.subscriptionPayment.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      amount: true,
      periodMonths: true,
      reference: true,
      createdAt: true,
      subscription: { select: { establishment: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return payments.map((payment: any) => ({
    id: payment.id,
    establishmentName: payment.subscription.establishment.name,
    createdAt: payment.createdAt,
    amount: payment.amount,
    periodMonths: payment.periodMonths,
    reference: payment.reference,
  }));
}

export type PlatformSubscriptionEstablishmentView = {
  id: string;
  name: string;
  status: EstablishmentStatus;
  createdAt: Date;
  adminName: string | null;
  adminEmail: string | null;
  subscription: {
    id: string;
    trialStartedAt: Date;
    currentPeriodEnd: Date;
    daysRemaining: number;
    isExpired: boolean;
    isTrial: boolean;
    confirmedPaymentsCount: number;
  } | null;
};

export type PlatformSubscriptionPaymentHistoryItem = {
  id: string;
  establishmentName: string;
  amount: number;
  periodMonths: number;
  status: string;
  reference: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  confirmedByName: string | null;
};

export type PlatformSubscriptionsOverview = {
  kpis: {
    totalSubscriptions: number;
    activeCount: number;
    trialCount: number;
    expiredCount: number;
    pendingRequestsCount: number;
    totalRevenueFcfa: number;
  };
  pendingPayments: PendingSubscriptionPaymentView[];
  establishments: PlatformSubscriptionEstablishmentView[];
  recentPayments: PlatformSubscriptionPaymentHistoryItem[];
};

/**
 * Vue complète et professionnelle des abonnements pour l'administrateur de plateforme.
 * Regroupe tous les établissements avec leur état d'abonnement, les demandes en attente,
 * les KPIs et l'historique de tous les paiements.
 */
export async function getPlatformSubscriptionsOverview(): Promise<PlatformSubscriptionsOverview> {
  await requirePlatformAdmin();
  const now = new Date();

  const [
    allEstablishments,
    pendingPaymentsRaw,
    allConfirmedPayments,
    recentPaymentsRaw,
  ] = await Promise.all([
    prisma.establishment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: { where: { role: "ADMIN" }, take: 1, select: { name: true, email: true, username: true } },
        subscription: {
          include: {
            payments: {
              where: { status: "CONFIRMED" },
              select: { id: true, amount: true },
            },
          },
        },
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        periodMonths: true,
        reference: true,
        createdAt: true,
        subscription: {
          select: {
            establishment: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: "CONFIRMED" },
      select: { amount: true },
    }),
    prisma.subscriptionPayment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        periodMonths: true,
        status: true,
        reference: true,
        createdAt: true,
        confirmedAt: true,
        confirmedBy: { select: { name: true, username: true } },
        subscription: {
          select: {
            establishment: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const totalRevenueFcfa = allConfirmedPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  let activeCount = 0;
  let trialCount = 0;
  let expiredCount = 0;
  let totalSubscriptions = 0;

  const establishments: PlatformSubscriptionEstablishmentView[] = allEstablishments.map((est: any) => {
    let subView = null;
    if (est.subscription) {
      totalSubscriptions++;
      const endMs = est.subscription.currentPeriodEnd.getTime();
      const diffMs = endMs - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = endMs <= now.getTime();
      const confirmedCount = est.subscription.payments.length;
      const isTrial = confirmedCount === 0;

      if (isExpired) {
        expiredCount++;
      } else {
        activeCount++;
        if (isTrial) {
          trialCount++;
        }
      }

      subView = {
        id: est.subscription.id,
        trialStartedAt: est.subscription.trialStartedAt,
        currentPeriodEnd: est.subscription.currentPeriodEnd,
        daysRemaining,
        isExpired,
        isTrial,
        confirmedPaymentsCount: confirmedCount,
      };
    }

    const admin = est.users[0];
    return {
      id: est.id,
      name: est.name,
      status: est.status,
      createdAt: est.createdAt,
      adminName: admin?.name ?? null,
      adminEmail: admin?.email ?? admin?.username ?? null,
      subscription: subView,
    };
  });

  const pendingPayments: PendingSubscriptionPaymentView[] = pendingPaymentsRaw.map((p: any) => ({
    id: p.id,
    establishmentName: p.subscription.establishment.name,
    createdAt: p.createdAt,
    amount: p.amount,
    periodMonths: p.periodMonths,
    reference: p.reference,
  }));

  const recentPayments: PlatformSubscriptionPaymentHistoryItem[] = recentPaymentsRaw.map((p: any) => ({
    id: p.id,
    establishmentName: p.subscription.establishment.name,
    amount: p.amount,
    periodMonths: p.periodMonths,
    status: p.status,
    reference: p.reference,
    createdAt: p.createdAt,
    confirmedAt: p.confirmedAt,
    confirmedByName: p.confirmedBy?.name ?? p.confirmedBy?.username ?? null,
  }));

  return {
    kpis: {
      totalSubscriptions,
      activeCount,
      trialCount,
      expiredCount,
      pendingRequestsCount: pendingPayments.length,
      totalRevenueFcfa,
    },
    pendingPayments,
    establishments,
    recentPayments,
  };
}

