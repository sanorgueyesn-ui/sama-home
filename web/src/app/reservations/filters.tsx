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
    <div className="mt-4">
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-transparent bg-white px-3.5 shadow-[0_1px_2px_rgba(18,48,74,0.05)] focus-within:border-navy">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B7A87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          aria-label="Rechercher une réservation par nom ou téléphone"
          className="flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-navy/40"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value, defaultPropertyId)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
              defaultTime === chip.value ? "bg-navy text-white" : "bg-white text-navy"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {properties.length > 0 ? (
        <select
          value={defaultPropertyId}
          onChange={(e) => pushParams(query, defaultTime, e.target.value)}
          aria-label="Filtrer par logement"
          className="mt-3 h-11 w-full rounded-xl border border-navy/10 bg-white px-3 text-sm text-navy outline-none focus:border-navy"
        >
          <option value="">Tous les logements</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
