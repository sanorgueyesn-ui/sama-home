import { Badge, InfoRow, PageHeader, PageShell, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { getCurrentUser } from "@/lib/dal";
import {
  getSubscriptionStatus,
  type SubscriptionStatusView,
} from "@/lib/subscription-data";
import { RequestRenewalForm } from "./request-renewal-form";
import { PayOnlineForm, type OnlineOffer } from "./pay-online-form";
import { prisma } from "@/lib/prisma";
import { getPaydunyaConfig } from "@/lib/paydunya";
import { planFeatures, planOffer } from "@/lib/subscription-plans";
import { CATEGORY_PRICING } from "@/lib/pricing-config";
import { categoryOfMode } from "@/lib/subscription-plans";
import { T } from "@/components/i18n/i18n-provider";
import { dateLocale } from "@/lib/i18n/date-locale";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat(dateLocale(), { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

const ESTABLISHMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente d'approbation",
  ACTIVE: "Actif",
  REJECTED: "Refusé",
  SUSPENDED: "Suspendu",
};

function Row({ label, value }: { label: string; value: string }) {
  return <InfoRow label={label}><T>{value}</T></InfoRow>;
}

function SubscriptionSummary({ status }: { status: SubscriptionStatusView }) {
  return (
    <Surface>
      <Row
        label="Statut de l'établissement"
        value={status.establishmentStatus ? (ESTABLISHMENT_STATUS_LABELS[status.establishmentStatus] ?? status.establishmentStatus) : "Inconnu"}
      />
      {status.hasSubscription ? (
        <>
          <Row label="Essai démarré le" value={fmtDate(status.trialStartedAt!)} />
          <Row label="Fin de la période actuelle" value={fmtDate(status.currentPeriodEnd!)} />
          <Row label="État de l'abonnement" value={status.isExpired ? "Expiré" : "Actif"} />
        </>
      ) : (
        <p className="py-3 text-sm font-semibold text-app-text-2">
          <T>Aucun abonnement n&apos;est configuré pour cet établissement.</T>
        </p>
      )}
    </Surface>
  );
}

/**
 * Phase 3G / Lot D12-P58 — trois branches mutuellement exclusives, dans cet
 * ordre : (1) une demande est déjà `PENDING` → l'afficher, jamais de
 * nouveau formulaire tant qu'elle n'est pas traitée ; (2) aucun abonnement
 * configuré → expliquer pourquoi la demande est impossible, sans proposer
 * un formulaire que createSubscriptionPaymentRequest() refuserait de toute
 * façon ; (3) rôle non autorisé → ne jamais afficher le formulaire à un
 * compte qui ne pourrait de toute façon pas l'utiliser (défense en
 * profondeur ; en pratique, tout compte rattaché à un établissement porte
 * déjà l'un des deux rôles autorisés) ; sinon, le formulaire réel. Aucune de
 * ces branches n'affirme qu'un paiement est confirmé — seul un
 * administrateur de plateforme pourra un jour le faire, via une action
 * distincte non développée dans ce lot.
 */
function RenewalSection({ status, canRequestRenewal }: { status: SubscriptionStatusView; canRequestRenewal: boolean }) {
  if (status.pendingPaymentRequest) {
    const { amount, periodMonths, createdAt } = status.pendingPaymentRequest;
    return (
      <Surface>
        <h2 className="mb-1 text-sm font-bold text-app-text"><T>Renouvellement</T></h2>
        <Row label="Demande envoyée le" value={fmtDate(createdAt)} />
        <Row label="Montant demandé" value={`${fmtFcfa(amount)} / ${periodMonths} mois`} />
        <p className="pt-2 text-[11px] font-medium text-app-muted">
          <T>Demande en attente de confirmation par un administrateur de la plateforme. Aucun paiement n&apos;est encore
          confirmé et l&apos;abonnement n&apos;a pas été prolongé.</T>
        </p>
      </Surface>
    );
  }

  if (!status.hasSubscription) {
    return (
      <Surface>
        <h2 className="mb-1 text-sm font-bold text-app-text"><T>Renouvellement</T></h2>
        <p className="text-sm font-semibold text-app-text-2">
          <T>Aucun abonnement n&apos;est configuré pour cet établissement — contactez un administrateur de la plateforme
          avant de pouvoir demander un renouvellement.</T>
        </p>
      </Surface>
    );
  }

  if (!canRequestRenewal) {
    return (
      <Surface>
        <h2 className="mb-1 text-sm font-bold text-app-text"><T>Renouvellement</T></h2>
        <p className="text-sm font-semibold text-app-text-2">
          <T>Seuls un administrateur ou un gestionnaire de l&apos;établissement peuvent initier un renouvellement.</T>
        </p>
      </Surface>
    );
  }

  return (
    <Surface>
      <h2 className="mb-1 text-sm font-bold text-app-text"><T>Renouvellement</T></h2>
      <Row
        label="Montant qui sera demandé"
        value={`${fmtFcfa(status.pricing.periodPriceFcfa)} / ${status.pricing.periodMonths} mois`}
      />
      <div className="mt-3">
        <RequestRenewalForm />
      </div>
    </Surface>
  );
}

function PlanSummary({ planName, features }: { planName: string | null; features: string[] }) {
  return (
    <Surface>
      <h2 className="mb-1 text-sm font-bold text-app-text"><T>Formule actuelle</T></h2>
      {planName ? (
        <>
          <p className="text-sm font-extrabold text-app-text"><T>{planName}</T></p>
          <ul className="mt-2 space-y-1 text-xs font-medium text-app-text-2">
            {features.map((f) => (
              <li key={f}>✓ <T>{f}</T></li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm font-semibold text-app-text-2">
          <T>Aucune formule choisie : votre établissement n'a pas de limite pour le moment. Choisissez une formule ci-dessous pour continuer après l'échéance.</T>
        </p>
      )}
    </Surface>
  );
}

/**
 * Phase 3G / Lot D12-P56 — page accessible à tout utilisateur authentifié
 * rattaché à un établissement, quel que soit le statut de celui-ci ou de son
 * abonnement (établissement inactif, sans abonnement, expiré). N'appelle PAS
 * `requireActiveEstablishment()` : cette fonction sert à BLOQUER une mutation
 * métier, jamais à afficher un statut, et cette page doit au contraire rester
 * consultable précisément dans les cas où `requireActiveEstablishment()`
 * refuserait l'accès à une action. Seul `getCurrentUser()` est appelé —
 * redirige vers /login si la session est absente/invalide (comportement
 * déjà existant et désiré, aucune session valide ne doit jamais atteindre
 * cette page), mais ne redirige JAMAIS pour une raison liée à
 * l'établissement ou à l'abonnement (confirmé par lecture de dal.ts).
 * Aucune modification du proxy : cette page reste une route authentifiée
 * ordinaire, déjà couverte par son comportement par défaut.
 *
 * ADMIN et GESTIONNAIRE y ont un accès identique (règle produit validée) —
 * aucune restriction de rôle supplémentaire n'est nécessaire ici : tout
 * compte rattaché à un établissement porte nécessairement l'un de ces deux
 * rôles (un rôle nul n'existe que pour un compte de plateforme, qui n'a par
 * définition aucun établissement — voir schema.prisma, modèle User).
 */
export default async function SubscriptionStatusPage() {
  const user = await getCurrentUser();

  if (!user.establishmentId) {
    return (
      <PageShell narrow>
        <PageHeader title="Abonnement" />
        <p className="text-sm font-semibold text-app-text-2">
          <T>Votre compte n&apos;est rattaché à aucun établissement — aucun statut d&apos;abonnement à afficher.</T>
        </p>
      </PageShell>
    );
  }

  const status = await getSubscriptionStatus(user.establishmentId);
  // Règle produit validée (D12-P56/P58) — ADMIN et GESTIONNAIRE d'un même
  // établissement ont un accès identique ; `isPlatformAdmin` n'intervient
  // jamais dans cette décision (booléen distinct, jamais confondu avec
  // `role === "ADMIN"`).
  const canRequestRenewal = user.role === "ADMIN" || user.role === "GESTIONNAIRE";

  let currentPlan: { name: string; features: string[] } | null = null;
  {
    const est = await prisma.establishment.findUnique({ where: { id: user.establishmentId }, select: { businessMode: true, subscription: { select: { planTier: true } } } });
    const tier = est?.subscription?.planTier;
    const offer = est && tier ? planOffer(est.businessMode, tier, "monthly") : null;
    if (est && tier && offer) currentPlan = { name: offer.name, features: planFeatures(est.businessMode, tier) };
  }
  // Paiement en ligne : proposé seulement si PayDunya est configuré sur le serveur.
  let onlineOffers: { offers: OnlineOffer[]; currentTier: OnlineOffer["tier"] | null } | null = null;
  if (getPaydunyaConfig() && process.env.APP_URL) {
    const establishment = await prisma.establishment.findUnique({
      where: { id: user.establishmentId },
      select: { businessMode: true, subscription: { select: { planTier: true } } },
    });
    if (establishment) {
      const tiers = ["ESSENTIAL", "PRO", "PREMIUM"] as const;
      const category = CATEGORY_PRICING[categoryOfMode(establishment.businessMode)];
      const offers: OnlineOffer[] = [];
      for (const tier of tiers) {
        const monthly = planOffer(establishment.businessMode, tier, "monthly");
        const annual = planOffer(establishment.businessMode, tier, "annual");
        const plan = category.plans.find((p) => p.name === monthly?.name);
        if (monthly && annual && plan) {
          offers.push({ tier, name: monthly.name, monthlyFcfa: monthly.amountFcfa, annualFcfa: annual.amountFcfa, units: plan.limits.unitsMax, users: plan.limits.usersMax, features: plan.features });
        }
      }
      onlineOffers = { offers, currentTier: establishment.subscription?.planTier ?? null };
    }
  }

  const space = await getActiveSpace();
  const stateBadge = !status.hasSubscription ? (
    <Badge><T>Aucun abonnement</T></Badge>
  ) : status.isExpired ? (
    <Badge tone="bad"><T>Expiré</T></Badge>
  ) : (
    <Badge tone="good"><T>Actif</T></Badge>
  );

  return (
    <PageShell narrow>
      <PageHeader eyebrow={space.name} title="Abonnement" badge={stateBadge} />
      <SubscriptionSummary status={status} />
      <PlanSummary planName={currentPlan?.name ?? null} features={currentPlan?.features ?? []} />
      {canRequestRenewal && status.hasSubscription && onlineOffers ? (
        <Surface>
          <h2 className="mb-2 text-sm font-bold text-app-text"><T>Payer en ligne</T></h2>
          <PayOnlineForm offers={onlineOffers.offers} currentTier={onlineOffers.currentTier} />
        </Surface>
      ) : null}
      {status.pendingPaymentRequest ? <RenewalSection status={status} canRequestRenewal={canRequestRenewal} /> : null}
      <p className="text-[11px] font-medium text-app-muted">
        <T>Seul un administrateur de plateforme peut confirmer un paiement — aucune confirmation n&apos;est possible
        depuis cette page.</T>
      </p>
    </PageShell>
  );
}
