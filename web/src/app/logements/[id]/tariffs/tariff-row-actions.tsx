"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTariffActive, deleteTariff } from "@/app/actions/tariffs";
import { EditIcon } from "@/components/ui/icons";

export function TariffRowActions({
  id,
  propertyId,
  active,
  label,
}: {
  id: string;
  propertyId: string;
  active: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleTariffActive(id, !active);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement ce tarif${label ? ` « ${label} »` : ""} ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTariff(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {/* Bouton Modifier clairement visible */}
        <Link
          href={`/logements/${propertyId}/tariffs/${id}/edit`}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-orange/40 bg-brand-orange/15 px-2.5 text-xs font-bold text-brand-orange hover:bg-brand-orange/25 active:scale-95 transition-all"
        >
          <EditIcon className="h-3 w-3" />
          <span>Modifier</span>
        </Link>

        {/* Bouton Activer / Désactiver */}
        <button
          type="button"
          disabled={pending}
          onClick={handleToggle}
          className={`h-8 rounded-lg px-2.5 text-xs font-bold disabled:opacity-60 transition-all ${
            active
              ? "bg-surface-sunken border border-white/10 text-fg/70 hover:bg-white/5"
              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
          }`}
        >
          {active ? "Désactiver" : "Activer"}
        </button>

        {/* Bouton Supprimer */}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Supprimer ce tarif"
          title="Supprimer ce tarif"
          className="flex h-8 items-center justify-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
        >
          <span>🗑️</span>
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>

      {error ? <p className="max-w-64 text-right text-[11px] font-semibold text-rose-300">{error}</p> : null}
    </div>
  );
}
