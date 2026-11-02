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
    <div>
      <div className="flex h-11 items-center gap-2.5 rounded-xl border border-app-line-strong bg-app-panel px-3.5 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/40">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-app-faint" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un logement..."
          aria-label="Rechercher un logement"
          className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-faint"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value)}
            aria-pressed={defaultType === chip.value}
            className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-xs font-bold ${
              defaultType === chip.value ? "bg-brand-orange text-ink" : "border border-app-line-strong bg-app-panel text-app-text-2 hover:bg-app-hover"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
