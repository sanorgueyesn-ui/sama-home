import { listPlatformDecisions, type PlatformDecisionView, type PlatformDecisionAction } from "@/lib/audit-log-data";
import { ACTION_LABELS } from "./action-labels";
import { HistoryFilterBar } from "./filter-bar";
import { requirePlatformPermission } from "@/lib/dal";

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Phase 3G / Lot D12-P103 — formatage GÉNÉRIQUE de `oldValue`/`newValue`
 * (forme différente selon l'action, jamais connue à l'avance ici) : une
 * paire "clé: valeur" par propriété d'un objet simple, séparées par des
 * virgules. Jamais une mise en forme spécifique par action (aucune donnée
 * inventée pour "faire joli") — si la valeur n'est ni un objet ni `null`,
 * affichée telle quelle via `String()`.
 */
function formatJsonSnapshot(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return null;
    return entries.map(([key, v]) => `${key}: ${String(v)}`).join(", ");
  }
  return String(value);
}

/**
 * Phase 3G / Lot D12-P95 — une ligne de l'historique. Affiche fidèlement les
 * données réelles de `listPlatformDecisions()` : jamais un nom ni un motif
 * inventé en leur absence. "Plateforme" uniquement quand `establishmentName`
 * est réellement `null` (voir le commentaire de la fonction) ; badge
 * "Automatique / système" uniquement quand `isSystemAction` est `true`
 * (reflet exact de `userId === null`, jamais déduit autrement).
 */
function DecisionRow({ decision }: { decision: PlatformDecisionView }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-extrabold text-white">{ACTION_LABELS[decision.action]}</p>
          {decision.isSystemAction ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
              Automatique / système
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-white/50">{fmtDateTime(decision.createdAt)}</p>
        <p className="mt-1 text-sm font-semibold text-white/90">
          {decision.establishmentName ?? "Plateforme"}
        </p>
        {decision.actorName ? (
          <p className="mt-0.5 text-[11px] font-medium text-white/40">Par {decision.actorName}</p>
        ) : null}
        {decision.reason ? (
          <p className="mt-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70">
            Motif : {decision.reason}
          </p>
        ) : null}
        {(() => {
          const before = formatJsonSnapshot(decision.oldValue);
          const after = formatJsonSnapshot(decision.newValue);
          if (!before && !after) return null;
          return (
            <p className="mt-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70">
              {before ? <>Avant : {before}<br /></> : null}
              {after ? <>Après : {after}</> : null}
            </p>
          );
        })()}
      </div>
    </div>
  );
}

export default async function PlatformHistoryPage(props: PageProps<"/plateforme/historique">) {
  await requirePlatformPermission("PLATFORM_AUDIT");
  const { action, q } = await props.searchParams;
  const actionParam = typeof action === "string" ? action : "ALL";
  const query = typeof q === "string" ? q : "";

  let items: PlatformDecisionView[] = [];
  let truncated = false;
  let loadError: string | null = null;
  try {
    const result = await listPlatformDecisions({ actionFilter: actionParam, query });
    items = result.items;
    truncated = result.truncated;
  } catch (error) {
    // D12-P172 — même correction que PlatformDashboardPage() : ne jamais
    // avaler le signal interne redirect() de Next.js (digest "NEXT_REDIRECT").
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformHistoryPage() — échec du chargement :", error);
    loadError = "Impossible de charger l'historique pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <h1 className="text-2xl font-extrabold text-white">Historique des décisions</h1>
      <p className="mt-1 text-xs font-medium text-white/50">
        Décisions de plateforme réellement journalisées — n&apos;inclut pas les mutations métier internes aux
        établissements.
      </p>

      <div className="mt-4">
        <HistoryFilterBar defaultAction={actionParam as PlatformDecisionAction | "ALL"} defaultQuery={query} />
      </div>

      {loadError ? (
        <p className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-white/70">
          {query || actionParam !== "ALL" ? "Aucune décision ne correspond à ces critères." : "Aucune décision journalisée pour le moment."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((decision) => (
            <DecisionRow key={decision.id} decision={decision} />
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
