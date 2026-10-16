"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PlatformDecisionAction } from "@/lib/audit-log-data";
import { ACTION_LABELS } from "./action-labels";

/**
 * Lot D12-P99 — correction d'une violation de frontière serveur/client :
 * `@/lib/audit-log-data` commence par `import "server-only"` (il lit
 * `AuditLog` via Prisma) — un Client Component ne peut donc importer QUE des
 * types de ce module (effacés à la compilation), jamais une valeur réelle
 * comme l'ancien `PLATFORM_DECISION_ACTIONS` (cause racine identifiée en
 * D12-P98 de l'ENOENT sur le manifeste de compilation de cette route).
 * `ACTION_LABELS` (./action-labels.ts) est lui un module ordinaire, sans
 * `server-only`, sûr à importer ici. Son type `Record<PlatformDecisionAction,
 * string>` garantit déjà, à la compilation, qu'il contient exactement les 8
 * clés de `PlatformDecisionAction` — ni plus, ni moins — donc
 * `Object.keys(ACTION_LABELS)` égale exactement la liste blanche serveur
 * `PLATFORM_DECISION_ACTIONS`, sans jamais la dupliquer ni risquer une
 * divergence silencieuse.
 */
const ACTION_OPTIONS: { value: PlatformDecisionAction | "ALL"; label: string }[] = [
  { value: "ALL", label: "Toutes les actions" },
  ...(Object.keys(ACTION_LABELS) as PlatformDecisionAction[]).map((action) => ({
    value: action,
    label: ACTION_LABELS[action],
  })),
];

/**
 * Phase 3G / Lot D12-P95 — même convention que EstablishmentFilterBar
 * (src/app/plateforme/etablissements/filter-bar.tsx) : écrit dans l'URL
 * (searchParams `action`/`q`), jamais un état client séparé de la source de
 * vérité serveur — `listPlatformDecisions()` revalide et valide ces deux
 * valeurs indépendamment, cette barre n'est qu'un confort d'interface.
 */
export function HistoryFilterBar({
  defaultAction,
  defaultQuery,
}: {
  defaultAction: PlatformDecisionAction | "ALL";
  defaultQuery: string;
}) {
  const [action, setAction] = useState(defaultAction);
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextAction: string, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextAction && nextAction !== "ALL") params.set("action", nextAction);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(action, query), 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleActionChange(next: PlatformDecisionAction | "ALL") {
    setAction(next);
    pushParams(next, query);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 focus-within:border-brand-orange">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-white/40"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom d'établissement..."
          aria-label="Rechercher par nom d'établissement"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <select
        value={action}
        onChange={(e) => handleActionChange(e.target.value as PlatformDecisionAction | "ALL")}
        aria-label="Filtrer par action"
        className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white outline-none focus:border-brand-orange sm:w-64"
      >
        {ACTION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0e1a22] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
