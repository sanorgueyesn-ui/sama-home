"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TYPE_CHIPS: { value: "" | "ROOM" | "APARTMENT"; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "ROOM", label: "Chambres" },
  { value: "APARTMENT", label: "Appartements" },
];

export function PropertyFilters({
  defaultQuery,
  defaultType,
}: {
  defaultQuery: string;
  defaultType: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextQuery: string, nextType: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextType) params.set("type", nextType);
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(query, defaultType), 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mt-4">
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-transparent bg-surface-raised px-3.5 shadow-card focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-fg/40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      <div className="mt-3 flex gap-2">
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value)}
            aria-pressed={defaultType === chip.value}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              defaultType === chip.value ? "bg-navy text-white" : "bg-surface-raised text-fg"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
