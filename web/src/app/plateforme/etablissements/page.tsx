import { listEstablishments, type EstablishmentListView, type EstablishmentStatusFilter } from "@/lib/establishment-data";
import { EstablishmentDecisionButtons } from "../establishment-decision-buttons";
import { EstablishmentLifecycleButtons } from "./establishment-lifecycle-buttons";
import { EstablishmentFilterBar } from "./filter-bar";
import { requirePlatformPermission } from "@/lib/dal";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

const STATUS_BADGE: Record<EstablishmentListView["status"], { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-500/15 text-amber-300" },
  ACTIVE: { label: "Actif", className: "bg-emerald-500/15 text-emerald-300" },
  SUSPENDED: { label: "Suspendu", className: "bg-orange-500/15 text-orange-300" },
  REJECTED: { label: "Refusé", className: "bg-danger-bg text-danger" },
};

/**
 * Phase 3G / Lot D12-P92 — état d'abonnement affiché en lecture seule
 * uniquement, jamais une autorité : `requireActiveEstablishment()`
 * (src/lib/dal.ts) reste la seule source qui décide d'un blocage d'accès
 * métier réel. Aucune donnée inventée — "Aucun abonnement" reflète
 * fidèlement l'absence de ligne `Subscription` (cas réel : établissement
 * encore `PENDING`, ou historique incohérent).
 */
function SubscriptionState({ currentPeriodEnd, now }: { currentPeriodEnd: Date | null; now: number }) {
  if (!currentPeriodEnd) {
    return <span className="text-white/40">Aucun abonnement</span>;
  }
  const expired = currentPeriodEnd.getTime() <= now;
  return (
    <span className={expired ? "font-semibold text-danger" : "text-white/60"}>
      {expired ? "Expiré le " : "Valide jusqu'au "}
      {fmtDate(currentPeriodEnd)}
    </span>
  );
}

function EstablishmentRow({ establishment, now }: { establishment: EstablishmentListView; now: number }) {
  const badge = STATUS_BADGE[establishment.status];
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-extrabold text-white">{establishment.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-white/50">Inscrit le {fmtDate(establishment.createdAt)}</p>
        <p className="mt-1 text-sm font-semibold text-white/90">
          {establishment.adminName ?? "—"}
          {establishment.adminEmail ? ` (${establishment.adminEmail})` : ""}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-white/40">
          {establishment.userCount} utilisateur{establishment.userCount > 1 ? "s" : ""}
        </p>
        <p className="mt-1 text-[11px]">
          <SubscriptionState currentPeriodEnd={establishment.subscriptionCurrentPeriodEnd} now={now} />
        </p>
      </div>

      <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
        {establishment.status === "PENDING" ? (
          <EstablishmentDecisionButtons establishmentId={establishment.id} establishmentName={establishment.name} />
        ) : establishment.status === "ACTIVE" || establishment.status === "SUSPENDED" ? (
          <EstablishmentLifecycleButtons
            establishmentId={establishment.id}
            establishmentName={establishment.name}
            status={establishment.status}
          />
        ) : null}
      </div>
    </div>
  );
}

export default async function PlatformEstablishmentsPage(props: PageProps<"/plateforme/etablissements">) {
  await requirePlatformPermission("PLATFORM_ESTABLISHMENTS");
  const { status, q } = await props.searchParams;
  const statusParam = typeof status === "string" ? status : "ALL";
  const query = typeof q === "string" ? q : "";
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  let items: EstablishmentListView[] = [];
  let truncated = false;
  let loadError: string | null = null;
  try {
    const result = await listEstablishments({ statusFilter: statusParam, query });
    items = result.items;
    truncated = result.truncated;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformEstablishmentsPage() — échec du chargement :", error);
    loadError = "Impossible de charger les établissements pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8 lg:px-10">
      <h1 className="text-2xl font-black text-white sm:text-3xl">Établissements</h1>
      <p className="mt-1 text-xs font-medium text-white/50 sm:text-sm">
        Gestion globale, suspension et suppression définitive des établissements partenaires.
      </p>

      <div className="mt-5">
        <EstablishmentFilterBar defaultStatus={statusParam as EstablishmentStatusFilter} defaultQuery={query} />
      </div>

      {loadError ? (
        <p className="mt-5 rounded-2xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-white/70">
          {query || statusParam !== "ALL" ? "Aucun établissement ne correspond à ces critères." : "Aucun établissement."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((establishment) => (
            <EstablishmentRow key={establishment.id} establishment={establishment} now={now} />
          ))}
          {truncated && (
            <p className="pt-1 text-center text-xs font-medium text-white/50">
              Affinez votre recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

