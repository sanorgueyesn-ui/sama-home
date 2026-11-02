"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTariffActive, deleteTariff } from "@/app/actions/tariffs";
import { EditIcon } from "@/components/ui/icons";
import { T, useT } from "@/components/i18n/i18n-provider";

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
  const t = useT();
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
      t(`Êtes-vous sûr de vouloir supprimer définitivement ce tarif${label ? ` « ${label} »` : ""} ?\n\nCette action est irréversible.`)
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
          <span><T>Modifier</T></span>
        </Link>

        {/* Bouton Activer / Désactiver */}
        <button
          type="button"
          disabled={pending}
          onClick={handleToggle}
          className={`h-8 rounded-lg px-2.5 text-xs font-bold disabled:opacity-60 transition-all ${
            active
              ? "bg-surface-sunken border border-white/10 text-fg/70 hover:bg-white/5"
              : "bg-success/15 border border-success/30 text-app-good hover:bg-success/25"
          }`}
        >
          {active ? <T>{"Désactiver"}</T> : <T>{"Activer"}</T>}
        </button>

        {/* Bouton Supprimer */}
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label={t("Supprimer ce tarif")}
          title={t("Supprimer ce tarif")}
          className="flex h-8 items-center justify-center gap-1 rounded-lg border border-danger/30 bg-danger/10 px-2 text-xs font-bold text-app-bad hover:bg-danger/20 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
        >
          <span>🗑️</span>
          <span className="hidden sm:inline"><T>Supprimer</T></span>
        </button>
      </div>

      {error ? <p className="max-w-64 text-right text-[11px] font-semibold text-app-bad"><T>{error}</T></p> : null}
    </div>
  );
}
