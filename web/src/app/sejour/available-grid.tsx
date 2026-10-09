"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PropertyPhoto } from "@/app/logements/property-photo";
// Import de TYPE uniquement (effacé à la compilation) : la vraie
// `StatusBadge`/`PROPERTY_STATUS_META` (app/logements/status-badge.tsx,
// lib/property-status.ts) ne peut pas être importée ici car ce fichier
// contient `import "server-only"` + Prisma — valide uniquement dans un
// composant serveur. Composant client, donc petite pastille locale
// dupliquée (même 4 statuts, mêmes tokens var(--color-X) que l'original),
// plutôt que de toucher au fichier moteur pour le rendre "client-safe".
import type { PropertyStatus } from "@/lib/property-status";

const STATUS_META: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Disponible", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  OCCUPIED: { label: "Occupé", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  RESERVED: { label: "Réservé", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  UNAVAILABLE: { label: "Indisponible", color: "var(--color-neutral)", bg: "var(--color-neutral-bg)" },
};

function StatusPill({ status }: { status: PropertyStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}

export type GridProperty = {
  id: string;
  name: string;
  type: "ROOM" | "APARTMENT";
  photo: string | null;
  status: PropertyStatus;
  /** Montant du tarif actif le moins cher pour ce logement, ou `null` si
   * aucun tarif actif n'existe — jamais inventé, voir sejour/page.tsx. */
  fromPrice: number | null;
};

const TABS: { value: "ALL" | PropertyStatus; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "OCCUPIED", label: "En cours" },
  { value: "RESERVED", label: "Réservés" },
  { value: "AVAILABLE", label: "Disponibles" },
];

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * Correctif Lot 2 (Séjour), section 8/9/10 — recherche + filtres + grille,
 * purement côté interface : filtre en mémoire la liste déjà chargée par le
 * composant serveur parent (sejour/page.tsx), aucune requête, aucune
 * nouvelle route/API/Server Action.
 */
export function SejourAvailableGrid({ properties }: { properties: GridProperty[] }) {
  const [tab, setTab] = useState<"ALL" | PropertyStatus>("ALL");
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = properties.filter((p) => {
    if (tab !== "ALL" && p.status !== tab) return false;
    if (trimmedQuery && !p.name.toLowerCase().includes(trimmedQuery)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex h-11 items-center gap-2.5 rounded-xl border border-transparent bg-surface-raised px-3.5 shadow-card focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-fg/40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un logement..."
          aria-label="Rechercher un logement"
          className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg/40"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            aria-pressed={tab === t.value}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              tab === t.value ? "bg-navy text-white" : "bg-surface-raised text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-fg/50">Aucun logement ne correspond à ces critères.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/logements/${p.id}`} className="block">
              <Card className="overflow-hidden p-0 transition hover:shadow-lg">
                <PropertyPhoto photo={p.photo} type={p.type} className="h-28 w-full" />
                <div className="p-2.5">
                  <p className="truncate text-xs font-extrabold text-fg">{p.name}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5">
                    <StatusPill status={p.status} />
                    {p.fromPrice !== null ? (
                      <span className="shrink-0 text-[11px] font-bold text-brand-orange">
                        Dès {fmtFcfa(p.fromPrice)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
