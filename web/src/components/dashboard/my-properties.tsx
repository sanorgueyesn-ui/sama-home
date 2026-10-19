"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyPhoto } from "@/app/logements/property-photo";
import { StayCountdown } from "@/components/dashboard/stay-countdown";
import type { PropertyStatus } from "@/lib/property-status";

export type MyPropertyItem = {
  id: string;
  name: string;
  type: "ROOM" | "APARTMENT";
  photo: string | null;
  status: PropertyStatus;
  /** Property.capacity — donnée réelle, toujours renseignée en base. */
  capacity: number;
  /** Montant du tarif actif le moins cher, ou `null` si aucun tarif actif. */
  fromPrice: number | null;
  /** Données de séjour actif si le logement est actuellement occupé */
  activeRental?: {
    id: string;
    arrivalAt: string | number | Date;
    plannedDepartureAt: string | number | Date;
    clientName?: string | null;
  } | null;
};

const STATUS_META: Record<
  PropertyStatus,
  { label: string; text: string; bg: string; border: string; pulse: string; dot: string }
> = {
  AVAILABLE: {
    label: "Disponible",
    text: "text-emerald-300",
    bg: "bg-emerald-950/80",
    border: "border-emerald-500/40",
    pulse: "bg-emerald-400",
    dot: "bg-emerald-400",
  },
  OCCUPIED: {
    label: "Occupé",
    text: "text-rose-300",
    bg: "bg-rose-950/80",
    border: "border-rose-500/40",
    pulse: "bg-rose-400",
    dot: "bg-rose-400",
  },
  RESERVED: {
    label: "Réservé",
    text: "text-sky-300",
    bg: "bg-sky-950/80",
    border: "border-sky-500/40",
    pulse: "bg-sky-400",
    dot: "bg-sky-400",
  },
  UNAVAILABLE: {
    label: "Indisponible",
    text: "text-neutral-300",
    bg: "bg-neutral-900/80",
    border: "border-white/10",
    pulse: "bg-neutral-400",
    dot: "bg-neutral-400",
  },
};

function StatusPill({ status }: { status: PropertyStatus }) {
  const meta = STATUS_META[status];
  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md border shadow-sm ${meta.bg} ${meta.border}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.pulse}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${meta.dot}`} />
      </span>
      <span className={`text-[11px] font-extrabold tracking-wide ${meta.text}`}>
        {meta.label}
      </span>
    </div>
  );
}

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function ActionButtons({ property }: { property: MyPropertyItem }) {
  if (property.status === "AVAILABLE") {
    if (property.fromPrice === null) {
      return (
        <Link
          href={`/logements/${property.id}/tariffs/new`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-xs font-bold text-amber-300 shadow-sm transition-all hover:bg-amber-500/25 active:scale-95"
        >
          <span>🏷️</span> Configurer un tarif
        </Link>
      );
    }

    return (
      <>
        <Link
          href={`/locations/new?propertyId=${property.id}`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-orange text-xs font-black text-ink shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <span>🔑</span> Louer
        </Link>
        <Link
          href={`/reservations/new?propertyId=${property.id}`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-fg backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
        >
          <span>📅</span> Réserver
        </Link>
      </>
    );
  }

  if (property.status === "OCCUPIED") {
    const targetHref = property.activeRental?.id
      ? `/locations/${property.activeRental.id}`
      : `/logements/${property.id}`;
    return (
      <Link
        href={targetHref}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-200 transition-all hover:bg-rose-500/20 active:scale-95"
      >
        <span>🚪</span> Gérer la sortie (Check-out)
      </Link>
    );
  }

  if (property.status === "RESERVED") {
    return (
      <Link
        href={`/logements/${property.id}`}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs font-bold text-sky-200 transition-all hover:bg-sky-500/20 active:scale-95"
      >
        <span>📅</span> Voir la réservation
      </Link>
    );
  }

  return (
    <Link
      href={`/logements/${property.id}`}
      className="flex h-9 flex-1 items-center justify-center rounded-xl border border-border/15 bg-surface-sunken text-xs font-bold text-fg/70 transition-all hover:bg-surface-raised"
    >
      Voir les détails
    </Link>
  );
}

/**
 * Modern Luxury Room Card
 */
function PropertyCard({ property }: { property: MyPropertyItem }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-surface-raised via-surface-raised/95 to-surface-raised/85 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange/40 hover:shadow-2xl hover:shadow-black/40">
      {/* Photo with Overlay Badges */}
      <div className="relative h-44 w-full overflow-hidden bg-surface-sunken">
        <Link href={`/logements/${property.id}`} className="block h-full w-full">
          <PropertyPhoto
            photo={property.photo}
            type={property.type}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Ambient Dark Gradients for contrast */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

        {/* Top Badges */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10.5px] font-bold text-white/90 backdrop-blur-md shadow-sm">
            {property.type === "ROOM" ? "🛏️ Chambre" : "🏢 Appartement"}
          </span>
          <StatusPill status={property.status} />
        </div>

        {/* Bottom Photo Overlay: Price and Capacity */}
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between">
          {property.fromPrice !== null ? (
            <div className="rounded-xl border border-brand-orange/30 bg-black/80 px-2.5 py-1 backdrop-blur-md shadow-md">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/60">Dès</span>
              <span className="text-xs font-black text-brand-orange">{fmtFcfa(property.fromPrice)}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/60 px-2 py-0.5 backdrop-blur-md">
              <span className="text-[10px] font-medium text-white/60">Tarif à définir</span>
            </div>
          )}
          <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white/80 backdrop-blur-md">
            👥 {property.capacity} pers.
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-3.5 gap-2.5">
        <div>
          <Link href={`/logements/${property.id}`}>
            <h3 className="truncate text-base font-extrabold text-white tracking-tight group-hover:text-brand-orange transition-colors">
              {property.name}
            </h3>
          </Link>
        </div>

        {/* Live Stay Countdown & Progress Bar (when occupied) */}
        {property.status === "OCCUPIED" && property.activeRental ? (
          <StayCountdown
            arrivalAt={property.activeRental.arrivalAt}
            plannedDepartureAt={property.activeRental.plannedDepartureAt}
            clientName={property.activeRental.clientName}
            rentalId={property.activeRental.id}
            variant="compact"
          />
        ) : null}

        {/* Action Buttons */}
        <div className="mt-1 flex gap-2">
          <ActionButtons property={property} />
        </div>
      </div>
    </div>
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
    return (
      <div className="mt-4 rounded-2xl border border-border/15 bg-surface-raised p-6 text-center">
        <p className="text-sm font-semibold text-fg/60">Aucun logement enregistré pour le moment.</p>
        <Link
          href="/logements/new"
          className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand-orange px-4 text-xs font-bold text-ink"
        >
          + Enregistrer une chambre
        </Link>
      </div>
    );
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
      {/* Category Filter Pills */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              filter === f.value
                ? "bg-brand-orange text-ink shadow-sm"
                : "bg-surface-raised text-fg/80 hover:bg-surface-sunken"
            }`}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-border/10 bg-surface-raised p-6 text-center">
          <p className="text-sm font-medium text-fg/50">Aucun logement ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
