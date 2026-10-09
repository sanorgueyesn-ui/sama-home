"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PropertyPhoto } from "@/app/logements/property-photo";
// Import de TYPE uniquement (effacé à la compilation) : la vraie
// `StatusBadge`/`property-status.ts` ne peut pas être importée ici (ce
// composant est désormais client, pour les filtres Stitch — import
// "server-only" + Prisma). Pastille locale dupliquée, même pattern que
// sejour/available-grid.tsx, mêmes tokens var(--color-X) que l'original.
import type { PropertyStatus } from "@/lib/property-status";

export type MyPropertyItem = {
  id: string;
  name: string;
  type: "ROOM" | "APARTMENT";
  photo: string | null;
  status: PropertyStatus;
  /** Property.capacity — donnée réelle, toujours renseignée en base. */
  capacity: number;
  /** Montant du tarif actif le moins cher, ou `null` si aucun tarif actif
   * n'existe pour ce logement — jamais inventé (même règle que
   * sejour/page.tsx, qui calcule déjà exactement cette valeur). */
  fromPrice: number | null;
};

const STATUS_META: Record<PropertyStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Disponible", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  OCCUPIED: { label: "Occupé", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  RESERVED: { label: "Réservé", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  UNAVAILABLE: { label: "Indisponible", color: "var(--color-neutral)", bg: "var(--color-neutral-bg)" },
};

function StatusPill({ status }: { status: PropertyStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/** Libellé d'action contextuel (maquette Stitch) — jamais un "Voir"
 * générique quand le statut réel permet d'être plus précis. */
function nonAvailableActionLabel(status: PropertyStatus) {
  if (status === "OCCUPIED") return "Voir la location";
  if (status === "RESERVED") return "Voir la réservation";
  return "Voir";
}

function ActionButtons({ property }: { property: MyPropertyItem }) {
  if (property.status === "AVAILABLE") {
    return (
      <>
        <Link
          href={`/locations/new?propertyId=${property.id}`}
          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-brand-orange text-xs font-bold text-ink"
        >
          Louer
        </Link>
        <Link
          href={`/reservations/new?propertyId=${property.id}`}
          className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/15 text-xs font-bold text-fg"
        >
          Réserver
        </Link>
      </>
    );
  }
  return (
    <Link
      href={`/logements/${property.id}`}
      className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/15 text-xs font-bold text-fg"
    >
      {nonAvailableActionLabel(property.status)}
    </Link>
  );
}

/**
 * Carte "vedette"/uniforme (photo réelle visible) — utilisée pour la 1ère
 * carte sur mobile (maquette Stitch : carte vedette) et pour toutes les
 * cartes en tablette/desktop (grille uniforme, maquette Stitch).
 */
function PropertyCard({ property }: { property: MyPropertyItem }) {
  return (
    <Card className="w-full overflow-hidden border border-border/10 p-0">
      <Link href={`/logements/${property.id}`} className="relative block">
        <PropertyPhoto photo={property.photo} type={property.type} className="h-40 w-full" />
        {/* Statut en incrustation sur la photo (maquette Stitch) — libère
            toute la largeur de la carte pour le nom en dessous, au lieu de
            se partager la ligne avec lui (évite une troncature agressive
            du nom sur les cartes étroites en grille 4 colonnes desktop). */}
        <div className="absolute top-2 right-2">
          <StatusPill status={property.status} />
        </div>
      </Link>
      <div className="p-3.5">
        <Link href={`/logements/${property.id}`}>
          <p className="truncate text-sm font-extrabold text-fg">{property.name}</p>
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-fg/60">👥 {property.capacity} pers.</span>
          {property.fromPrice !== null ? (
            <span className="shrink-0 text-xs font-bold text-brand-orange">Dès {fmtFcfa(property.fromPrice)}</span>
          ) : null}
        </div>
        <div className="mt-2.5 flex gap-2">
          <ActionButtons property={property} />
        </div>
      </div>
    </Card>
  );
}

/**
 * Carte compacte (mobile uniquement, pour toutes les cartes sauf la
 * vedette) — maquette Stitch : pas de grande photo, icône/repli. `photo`
 * forcé à `null` intentionnellement : même un logement avec une vraie
 * photo reste en icône ici, conformément à la maquette.
 */
function CompactCard({ property }: { property: MyPropertyItem }) {
  return (
    <Card className="w-full border border-border/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <PropertyPhoto photo={null} type={property.type} className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{property.name}</p>
            <p className="text-xs font-medium text-fg/60">👥 {property.capacity} pers.</p>
          </div>
        </div>
        <StatusPill status={property.status} />
      </div>
      {property.fromPrice !== null ? (
        <p className="mt-2 text-xs font-bold text-brand-orange">Dès {fmtFcfa(property.fromPrice)}</p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <ActionButtons property={property} />
      </div>
    </Card>
  );
}

type FilterValue = "ALL" | "AVAILABLE" | "OCCUPIED" | "RESERVED";
const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "AVAILABLE", label: "Disponibles" },
  { value: "OCCUPIED", label: "Occupés" },
  { value: "RESERVED", label: "Réservés" },
];

export function MyProperties({ items }: { items: MyPropertyItem[] }) {
  const [filter, setFilter] = useState<FilterValue>("ALL");

  if (items.length === 0) {
    return <p className="mt-2.5 text-sm font-medium text-fg/50">Aucun logement enregistré.</p>;
  }

  const counts: Record<FilterValue, number> = {
    ALL: items.length,
    AVAILABLE: items.filter((p) => p.status === "AVAILABLE").length,
    OCCUPIED: items.filter((p) => p.status === "OCCUPIED").length,
    RESERVED: items.filter((p) => p.status === "RESERVED").length,
  };
  const filtered = filter === "ALL" ? items : items.filter((p) => p.status === filter);

  return (
    <div>
      {/* Filtres (maquette Stitch) — filtrage en mémoire sur les données déjà
          chargées par page.tsx, aucune nouvelle requête/Server Action. */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filter === f.value ? "bg-brand-orange text-ink" : "bg-surface-raised text-fg"
            }`}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 text-sm font-medium text-fg/50">Aucun logement ne correspond à ce filtre.</p>
      ) : (
        <>
          {/* Lot Responsive 7 — espacement avant la grille augmenté sur
              mobile/tablette (revient à mt-3 dès lg, où il n'y a ni FAB ni
              barre de navigation fixe). Corrige un chevauchement réel mesuré
              entre les boutons Louer/Réserver de la 1ère carte et les
              éléments fixes du bas (FAB `bottom-20` + `h-14` = zone jusqu'à
              136px du bas sur mobile ; nav `bottom-4` + `h-16` = zone
              jusqu'à 80px du bas sur mobile/tablette, AppShell). Pousse tout
              le bloc (photo + texte + actions) de la 1ère carte sous cette
              zone au chargement initial, sans dépendre du nombre de
              logements : seule la position de départ de la grille change,
              les cartes suivantes s'enchaînent normalement en dessous. */}

          {/* Mobile : 1 carte vedette (1er logement filtré) + reste en
              version compacte — maquette Stitch (accueil-mobile.html). */}
          <div className="mt-36 flex flex-col gap-3 md:hidden">
            <PropertyCard property={filtered[0]} />
            {filtered.slice(1).map((p) => (
              <CompactCard key={p.id} property={p} />
            ))}
          </div>

          {/* Tablette (2 colonnes) / Desktop (4 colonnes) : grille uniforme,
              toutes les cartes identiques — maquette Stitch. */}
          <div className="mt-24 hidden md:grid md:grid-cols-2 md:gap-4 lg:mt-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
