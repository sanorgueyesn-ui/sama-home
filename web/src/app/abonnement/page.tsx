import { Badge, InfoRow, PageHeader, PageShell, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { getCurrentUser } from "@/lib/dal";
import {
  getSubscriptionStatus,
  type SubscriptionStatusView,
} from "@/lib/subscription-data";
import { RequestRenewalForm } from "./request-renewal-form";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

const ESTABLISHMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente d'approbation",
  ACTIVE: "Actif",
  REJECTED: "Refusé",
  SUSPENDED: "Suspendu",
};

function Row({ label, value }: { label: string; value: string }) {
  return <InfoRow label={label}>{value}</InfoRow>;
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
          Aucun abonnement n&apos;est configuré pour cet établissement.
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
        <h2 className="mb-1 text-sm font-bold text-app-text">Renouvellement</h2>
        <Row label="Demande envoyée le" value={fmtDate(createdAt)} />
        <Row label="Montant demandé" value={`${fmtFcfa(amount)} / ${periodMonths} mois`} />
        <p className="pt-2 text-[11px] font-medium text-app-muted">
          Demande en attente de confirmation par un administrateur de la plateforme. Aucun paiement n&apos;est encore
          confirmé et l&apos;abonnement n&apos;a pas été prolongé.
        </p>
      </Surface>
    );
  }

  if (!status.hasSubscription) {
    return (
      <Surface>
        <h2 className="mb-1 text-sm font-bold text-app-text">Renouvellement</h2>
        <p className="text-sm font-semibold text-app-text-2">
          Aucun abonnement n&apos;est configuré pour cet établissement — contactez un administrateur de la plateforme
          avant de pouvoir demander un renouvellement.
        </p>
      </Surface>
    );
  }

  if (!canRequestRenewal) {
    return (
      <Surface>
        <h2 className="mb-1 text-sm font-bold text-app-text">Renouvellement</h2>
        <p className="text-sm font-semibold text-app-text-2">
          Seuls un administrateur ou un gestionnaire de l&apos;établissement peuvent initier un renouvellement.
        </p>
      </Surface>
    );
  }

  return (
    <Surface>
      <h2 className="mb-1 text-sm font-bold text-app-text">Renouvellement</h2>
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

function PricingSummary({ status }: { status: SubscriptionStatusView }) {
  return (
    <Surface>
      <h2 className="mb-1 text-sm font-bold text-app-text">Tarification</h2>
      <Row label="Essai gratuit" value={`${status.pricing.trialDurationMonths} mois`} />
      <Row
        label="Tarif après essai"
        value={`${fmtFcfa(status.pricing.periodPriceFcfa)} / ${status.pricing.periodMonths} mois`}
      />
      {!status.pricing.isConfigured ? (
        <p className="pt-2 text-[11px] font-medium text-app-muted">
          Tarif par défaut — aucune configuration personnalisée n&apos;a encore été enregistrée.
        </p>
      ) : null}
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
          Votre compte n&apos;est rattaché à aucun établissement — aucun statut d&apos;abonnement à afficher.
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

  const space = await getActiveSpace();
  const stateBadge = !status.hasSubscription ? (
    <Badge>Aucun abonnement</Badge>
  ) : status.isExpired ? (
    <Badge tone="bad">Expiré</Badge>
  ) : (
    <Badge tone="good">Actif</Badge>
  );

  return (
    <PageShell narrow>
      <PageHeader eyebrow={space.name} title="Abonnement" badge={stateBadge} />
      <SubscriptionSummary status={status} />
      <PricingSummary status={status} />
      <RenewalSection status={status} canRequestRenewal={canRequestRenewal} />
      <p className="text-[11px] font-medium text-app-muted">
        Seul un administrateur de plateforme peut confirmer un paiement — aucune confirmation n&apos;est possible
        depuis cette page.
      </p>
    </PageShell>
  );
}
