"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PERIOD_CHIPS: { value: string; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "month", label: "Ce mois" },
  { value: "all", label: "Toutes" },
];

const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "OTHER", label: "Autre" },
];

/**
 * Bloc 16.2, section 9 — les catégories viennent désormais de la DB
 * (actives + inactives déjà utilisées, voir listExpenseCategoriesForFilter
 * dans src/lib/expense-categories-data.ts), plus de liste statique. Une
 * catégorie inactive reste sélectionnable ici (jamais retirée de
 * l'historique) mais est clairement signalée comme telle.
 */
export function ExpenseFilters({
  defaultQuery,
  defaultPeriod,
  defaultCategory,
  defaultMethod,
  categories,
}: {
  defaultQuery: string;
  defaultPeriod: string;
  defaultCategory: string;
  defaultMethod: string;
  categories: { id: string; name: string; active: boolean }[];
}) {
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextQuery: string, nextPeriod: string, nextCategory: string, nextMethod: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextPeriod && nextPeriod !== "month") params.set("period", nextPeriod);
    if (nextCategory) params.set("category", nextCategory);
    if (nextMethod) params.set("method", nextMethod);
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(query, defaultPeriod, defaultCategory, defaultMethod), 300);
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
          placeholder="Rechercher par référence ou note..."
          aria-label="Rechercher une dépense par référence ou note"
          className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg/40"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {PERIOD_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => pushParams(query, chip.value, defaultCategory, defaultMethod)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              defaultPeriod === chip.value ? "bg-brand-orange text-ink" : "bg-surface-raised text-fg"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={defaultCategory}
          onChange={(e) => pushParams(query, defaultPeriod, e.target.value, defaultMethod)}
          aria-label="Filtrer par catégorie"
          className="h-11 w-full rounded-xl border border-border/15 bg-surface-raised px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.active ? c.name : `${c.name} (désactivée)`}
            </option>
          ))}
        </select>
        <select
          value={defaultMethod}
          onChange={(e) => pushParams(query, defaultPeriod, defaultCategory, e.target.value)}
          aria-label="Filtrer par mode de paiement"
          className="h-11 w-full rounded-xl border border-border/15 bg-surface-raised px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <option value="">Tous les modes</option>
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
