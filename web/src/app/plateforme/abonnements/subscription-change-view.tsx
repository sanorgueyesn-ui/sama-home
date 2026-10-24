import type { SubscriptionChangeOverview, SubscriptionChangeRequestView } from "@/lib/subscription-change-data";
import { SubscriptionChangeDecisionControls } from "./subscription-change-decision-controls";
import type { DecisionSummary } from "./subscription-change-decision-panel";

/**
 * Lot 3B (B2.14-A et B2.14-B) — présentation des demandes de paiement manuel et de prolongation. Composant
 * serveur (aucun hook). Seules les demandes EN ATTENTE reçoivent des commandes de décision, fournies par
 * le composant client `SubscriptionChangeDecisionControls` à partir des indicateurs `canApprove`,
 * `canReject` et `canCancel` calculés par la lecture serveur. Ces indicateurs ne servent qu'à choisir les
 * boutons affichés : l'autorisation réelle est revérifiée par chaque action serveur. Aucune demande
 * clôturée ne reçoit de commande.
 *
 * Ne reçoit que les données déjà filtrées par `getSubscriptionChangeOverview()` (jamais de hachage,
 * d'e-mail, d'identifiant de personne). Tous les textes libres sont rendus comme du texte (échappés par
 * React), jamais comme du HTML. Les propriétés passées au composant client sont du texte et des booléens.
 */

export type SubscriptionChangeSectionState =
  | { status: "ready"; overview: SubscriptionChangeOverview }
  /** La lecture a refusé l'accès (permission explicite « Abonnements » absente) : aucune donnée. */
  | { status: "forbidden" }
  /** La lecture a échoué : aucune donnée n'est présentée comme chargée. */
  | { status: "error" };

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

const KIND_LABEL: Record<SubscriptionChangeRequestView["kind"], string> = {
  MANUAL_PAYMENT: "Paiement manuel",
  PROLONGATION: "Prolongation",
};

const STATUS_BADGE: Record<SubscriptionChangeRequestView["status"], { label: string; className: string }> = {
  PENDING_SECOND_APPROVAL: {
    label: "En attente de seconde validation",
    className: "border border-amber-500/50 bg-amber-500/20 text-amber-300",
  },
  APPROVED: { label: "Approuvée", className: "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  REJECTED: { label: "Rejetée", className: "border border-danger/40 bg-danger/15 text-danger" },
  CANCELLED: { label: "Annulée", className: "border border-white/15 bg-white/10 text-white/70" },
};

function requestedDetails(request: SubscriptionChangeRequestView): string {
  if (request.kind === "MANUAL_PAYMENT") {
    const amount = request.amountFcfa === null ? "Montant non renseigné" : fmtFcfa(request.amountFcfa);
    const months = request.periodMonths === null ? "durée non renseignée" : `${request.periodMonths} mois`;
    return `${amount} · ${months}`;
  }
  return request.days === null ? "Durée non renseignée" : `${request.days} jour${request.days > 1 ? "s" : ""}`;
}

function StatusBadge({ status }: { status: SubscriptionChangeRequestView["status"] }) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function RequestBody({ request }: { request: SubscriptionChangeRequestView }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 truncate text-sm font-extrabold text-white">{request.establishment.name}</p>
        <StatusBadge status={request.status} />
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80">
          {KIND_LABEL[request.kind]}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-black text-brand-orange">{requestedDetails(request)}</p>
      <p className="mt-1 text-[11px] font-medium text-white/50">
        Demandée le {fmtDateTime(request.createdAt)}
        {" · "}
        {request.requesterMissing ? (
          <span>Demandeur supprimé</span>
        ) : (
          <span>
            par <strong className="text-white/80">{request.requesterName ?? "—"}</strong>
            {request.isOwnRequest ? " (vous)" : ""}
          </span>
        )}
      </p>
      {request.reference ? (
        <p className="mt-0.5 text-[11px] font-medium text-white/50">
          Référence : <span className="font-mono text-white/80">{request.reference}</span>
        </p>
      ) : null}
      {request.reason ? (
        <p className="mt-0.5 text-[11px] font-medium text-white/50">
          Motif : <span className="text-white/80">{request.reason}</span>
        </p>
      ) : null}
    </>
  );
}

function PendingRequestCard({ request }: { request: SubscriptionChangeRequestView }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <RequestBody request={request} />
      {request.requesterMissing ? (
        <p
          role="note"
          className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-semibold text-danger"
        >
          Le demandeur n&apos;existe plus : cette demande ne peut pas être approuvée. Elle ne pourra être que
          rejetée, et un motif de rejet est obligatoire.
        </p>
      ) : request.waitingForSecondAdministrator ? (
        <p
          role="note"
          className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200"
        >
          En attente d&apos;un autre administrateur autorisé : aucun autre compte disposant de la permission
          « Abonnements » n&apos;est disponible pour décider de cette demande. Elle reste en attente.
        </p>
      ) : request.isOwnRequest ? (
        <p role="note" className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/60">
          Vous avez fait cette demande : un autre administrateur doit la valider. Vous ne pouvez pas l&apos;approuver
          vous-même.
        </p>
      ) : (
        <p role="note" className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/60">
          En attente de la décision d&apos;un administrateur autorisé autre que le demandeur.
        </p>
      )}
      {request.canApprove || request.canReject || request.canCancel ? (
        <SubscriptionChangeDecisionControls
          requestId={request.id}
          canApprove={request.canApprove}
          canReject={request.canReject}
          canCancel={request.canCancel}
          summary={buildDecisionSummary(request)}
        />
      ) : null}
    </div>
  );
}

/** Texte de confirmation transmis au composant client : uniquement du texte, aucune donnée sensible. */
function buildDecisionSummary(request: SubscriptionChangeRequestView): DecisionSummary {
  let effect: string;
  if (request.kind === "MANUAL_PAYMENT") {
    const amount = request.amountFcfa === null ? "" : ` de ${fmtFcfa(request.amountFcfa)}`;
    const months = request.periodMonths === null ? "" : ` de ${request.periodMonths} mois`;
    effect = `Un règlement confirmé${amount} sera enregistré et l'abonnement sera prolongé${months}.`;
  } else {
    effect = `L'abonnement sera prolongé${request.days === null ? "" : ` de ${request.days} jour${request.days > 1 ? "s" : ""}`}.`;
  }
  return {
    kindLabel: KIND_LABEL[request.kind],
    establishmentName: request.establishment.name,
    details: requestedDetails(request),
    effect,
  };
}

function decisionSummary(request: SubscriptionChangeRequestView): string {
  const who = request.decidedByName;
  if (request.status === "APPROVED") return who ? `Approuvée par ${who}` : "Approuvée";
  if (request.status === "REJECTED") return who ? `Rejetée par ${who}` : "Rejetée";
  return who ? `Annulée par ${who}` : "Annulée automatiquement";
}

function ClosedRequestCard({ request }: { request: SubscriptionChangeRequestView }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e1a22] p-4">
      <RequestBody request={request} />
      <p className="mt-2 text-[11px] font-semibold text-white/70">
        {decisionSummary(request)}
        {request.decidedAt ? ` le ${fmtDateTime(request.decidedAt)}` : ""}
      </p>
      {request.decisionReason ? (
        <p className="mt-0.5 text-[11px] font-medium text-white/50">
          Motif de la décision : <span className="text-white/80">{request.decisionReason}</span>
        </p>
      ) : null}
    </div>
  );
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-8" aria-labelledby="subscription-change-title">
      <div className="border-b border-white/10 pb-3.5">
        <h2 id="subscription-change-title" className="text-base font-black text-white sm:text-lg">
          Paiements manuels et prolongations à valider
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Chaque demande doit être validée par un second administrateur : le demandeur peut annuler sa demande, un
          autre administrateur autorisé peut l&apos;approuver ou la rejeter (motif obligatoire).
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Indicateur de chargement affiché pendant la lecture (voir `<Suspense>` dans la page). */
export function SubscriptionChangeRequestsLoading() {
  return (
    <SectionShell>
      <div role="status" aria-live="polite" className="rounded-2xl border border-white/10 bg-[#0e1a22] p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/10" />
        <p className="mt-3 text-xs font-medium text-white/50">Chargement des demandes en cours…</p>
      </div>
    </SectionShell>
  );
}

export function SubscriptionChangeRequestsView({ state }: { state: SubscriptionChangeSectionState }) {
  if (state.status === "error") {
    return (
      <SectionShell>
        <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">
          Impossible de charger les demandes de paiement manuel et de prolongation pour le moment. Rechargez la
          page pour réessayer.
        </p>
      </SectionShell>
    );
  }

  if (state.status === "forbidden") {
    return (
      <SectionShell>
        <p role="status" className="rounded-2xl border border-white/10 bg-[#0e1a22] px-4 py-3 text-xs font-medium text-white/60">
          Cette section est réservée aux administrateurs de plateforme disposant explicitement de la permission
          « Abonnements ».
        </p>
      </SectionShell>
    );
  }

  const { pending, pendingTruncated, recentClosed } = state.overview;

  return (
    <SectionShell>
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-sm font-extrabold text-white">En attente de décision</h3>
        <span
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-black ${
            pending.length > 0
              ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
              : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
          }`}
        >
          {pending.length > 0 ? `${pending.length}${pendingTruncated ? "+" : ""} en attente` : "0 en attente"}
        </span>
      </div>

      {pendingTruncated ? (
        <p role="alert" className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-200">
          Il y a plus de {pending.length} demandes en attente : la liste affichée est limitée aux {pending.length} plus
          anciennes.
        </p>
      ) : null}

      <div className="mt-3">
        {pending.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0e1a22] p-5 text-white/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-400">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-white">Aucune demande en attente</p>
              <p className="text-[11px] text-white/50">
                Aucun paiement manuel ni aucune prolongation n&apos;attend actuellement de seconde validation.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((request) => (
              <PendingRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-8 text-sm font-extrabold text-white">Demandes clôturées récentes</h3>
      <p className="mt-0.5 text-xs text-white/50">Les 20 dernières demandes approuvées, rejetées ou annulées.</p>
      <div className="mt-3">
        {recentClosed.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-[#0e1a22] p-6 text-center text-xs text-white/40">
            Aucune demande clôturée pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentClosed.map((request) => (
              <ClosedRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
