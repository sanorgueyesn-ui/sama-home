"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserRole, EstablishmentStatus } from "@/generated/prisma/client";
import { ROLE_LABELS, ESTABLISHMENT_STATUS_LABELS } from "./filter-labels";

type RoleFilter = UserRole | "ALL";
type StatusFilter = EstablishmentStatus | "ALL";

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Tous les rôles" },
  ...(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous les statuts d'établissement" },
  ...(Object.keys(ESTABLISHMENT_STATUS_LABELS) as EstablishmentStatus[]).map((status) => ({
    value: status,
    label: ESTABLISHMENT_STATUS_LABELS[status],
  })),
];

/**
 * Phase 3G / Lot D12-P101 — même convention que les barres de filtre
 * existantes (EstablishmentFilterBar, HistoryFilterBar) : écrit dans l'URL
 * (searchParams `role`/`status`/`platform`/`q`), jamais un état client
 * séparé de la source de vérité serveur — `listPlatformUsers()` revalide et
 * valide ces quatre valeurs indépendamment. Le filtre "Comptes de
 * plateforme uniquement" désactive visuellement les deux autres (cohérent
 * avec `listPlatformUsers()`, qui les ignore dans ce cas — voir son
 * commentaire).
 */
export function PlatformUserFilterBar({
  defaultRole,
  defaultStatus,
  defaultPlatformOnly,
  defaultQuery,
}: {
  defaultRole: RoleFilter;
  defaultStatus: StatusFilter;
  defaultPlatformOnly: boolean;
  defaultQuery: string;
}) {
  const [role, setRole] = useState(defaultRole);
  const [status, setStatus] = useState(defaultStatus);
  const [platformOnly, setPlatformOnly] = useState(defaultPlatformOnly);
  const [query, setQuery] = useState(defaultQuery);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function pushParams(nextRole: string, nextStatus: string, nextPlatformOnly: boolean, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextRole && nextRole !== "ALL") params.set("role", nextRole);
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPlatformOnly) params.set("platform", "1");
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    router.replace(params.size ? `${pathname}?${params}` : pathname);
  }

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => pushParams(role, status, platformOnly, query), 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleRoleChange(next: RoleFilter) {
    setRole(next);
    pushParams(next, status, platformOnly, query);
  }

  function handleStatusChange(next: StatusFilter) {
    setStatus(next);
    pushParams(role, next, platformOnly, query);
  }

  function handlePlatformOnlyChange(next: boolean) {
    setPlatformOnly(next);
    pushParams(role, status, next, query);
  }

  return (
    <div className="flex flex-col gap-2">
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
            placeholder="Rechercher par nom, identifiant ou e-mail..."
            aria-label="Rechercher par nom, identifiant ou e-mail"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
        <select
          value={role}
          disabled={platformOnly}
          onChange={(e) => handleRoleChange(e.target.value as RoleFilter)}
          aria-label="Filtrer par rôle"
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white outline-none focus:border-brand-orange disabled:opacity-40 sm:w-56"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#0e1a22] text-white">
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          disabled={platformOnly}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          aria-label="Filtrer par statut d'établissement"
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white outline-none focus:border-brand-orange disabled:opacity-40 sm:w-64"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#0e1a22] text-white">
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-white/70">
        <input
          type="checkbox"
          checked={platformOnly}
          onChange={(e) => handlePlatformOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5"
        />
        Comptes de plateforme uniquement
      </label>
    </div>
  );
}
