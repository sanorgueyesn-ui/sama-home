"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TIME_CHIPS: { value: string; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "today", label: "Aujourd'hui" },
  { value: "past", label: "Passées" },
  { value: "cancelled", label: "Annulées" },
  { value: "all", label: "Toutes" },
];

export function ReservationFilters({
  defaultQuery,
  defaultTime,
  defaultPropertyId,
  properties,
}: {
  defaultQuery: string;
  defaultTime: string;
  defaultPropertyId: string;
  properties: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextQuery: string, nextTime: string, nextPropertyId: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTime && nextTime !== "upcoming") params.set("time", nextTime);
    if (nextPropertyId) params.set("propertyId", nextPropertyId);
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(query, defaultTime, defaultPropertyId), 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mt-4 md:flex md:flex-wrap md:items-center md:gap-3">
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-transparent bg-surface-raised px-3.5 shadow-card focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange md:order-1 md:min-w-0 md:flex-1">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg/40">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          aria-label="Rechercher une réservation par nom ou téléphone"
          className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg/40"
        />
      </div>

      {properties.length > 0 ? (
        <select
          value={defaultPropertyId}
          onChange={(e) => pushParams(query, defaultTime, e.target.value)}
          aria-label="Filtrer par logement"
          className="mt-3 h-11 w-full rounded-xl border border-border/15 bg-surface-raised px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange md:order-2 md:mt-0 md:w-56 md:shrink-0"
        >
          <option value="">Tous les logements</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="mt-3 flex gap-2 overflow-x-auto md:order-3 md:mt-3 md:w-full">
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value, defaultPropertyId)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
              defaultTime === chip.value ? "bg-brand-orange text-ink" : "bg-surface-raised text-fg"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
