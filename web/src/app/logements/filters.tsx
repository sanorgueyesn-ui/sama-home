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
      <div className="flex h-12 items-center gap-2.5 rounded-xl bg-white px-3.5 shadow-[0_1px_2px_rgba(18,48,74,0.05)]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B7A87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un logement..."
          className="flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-navy/40"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              defaultType === chip.value ? "bg-navy text-white" : "bg-white text-navy"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
