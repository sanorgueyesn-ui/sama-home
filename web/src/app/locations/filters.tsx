"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TIME_CHIPS: { value: string; label: string }[] = [
  { value: "active", label: "En cours" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
  { value: "all", label: "Toutes" },
];

export function RentalFilters({
  defaultQuery,
  defaultTime,
  defaultPropertyId,
  properties,
  allUnitsLabel = "Tous les logements",
}: {
  defaultQuery: string;
  defaultTime: string;
  defaultPropertyId: string;
  properties: { id: string; name: string }[];
  allUnitsLabel?: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextQuery: string, nextTime: string, nextPropertyId: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTime && nextTime !== "active") params.set("time", nextTime);
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-app-line-strong bg-app-panel px-3.5 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/40">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-app-faint" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom ou téléphone"
          aria-label={`Rechercher par nom ou téléphone`}
          className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-faint"
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {TIME_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value, defaultPropertyId)}
            aria-pressed={defaultTime === chip.value}
            className={`h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus ${
              defaultTime === chip.value ? "bg-brand-orange text-ink" : "border border-app-line-strong bg-app-panel text-app-text-2 hover:bg-app-hover"
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
          className="h-11 rounded-xl border border-app-line-strong bg-app-panel px-3 text-sm text-app-text outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/40 lg:w-60"
        >
          <option value="">{allUnitsLabel}</option>
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
