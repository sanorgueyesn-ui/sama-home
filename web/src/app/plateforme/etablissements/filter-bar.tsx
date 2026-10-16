"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { EstablishmentStatusFilter } from "@/lib/establishment-data";

const STATUS_OPTIONS: { value: EstablishmentStatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "SUSPENDED", label: "Suspendus" },
  { value: "REJECTED", label: "Refusés" },
];

/**
 * Phase 3G / Lot D12-P92 — même convention que ClientSearchInput
 * (src/app/clients/search-input.tsx) : écrit dans l'URL (searchParams),
 * jamais un état client séparé de la source de vérité serveur — le filtre
 * de statut et la recherche sont combinés dans les mêmes paramètres `status`
 * et `q`, lus par la page serveur (`listEstablishments()` revalide et
 * valide ces deux valeurs indépendamment, cette barre n'est qu'un confort
 * d'interface, jamais une autorité).
 */
export function EstablishmentFilterBar({
  defaultStatus,
  defaultQuery,
}: {
  defaultStatus: EstablishmentStatusFilter;
  defaultQuery: string;
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextStatus: string, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(status, query), 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleStatusChange(next: EstablishmentStatusFilter) {
    setStatus(next);
    pushParams(next, query);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 focus-within:border-brand-orange">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-white/40"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou e-mail de l'administrateur..."
          aria-label="Rechercher un établissement par nom ou e-mail de l'administrateur initial"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as EstablishmentStatusFilter)}
        aria-label="Filtrer par statut"
        className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white outline-none focus:border-brand-orange sm:w-48"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0e1a22] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
