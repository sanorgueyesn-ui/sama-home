"use client";

import { useState, useTransition } from "react";
import { toggleTariffActive, deleteTariff } from "@/app/actions/tariffs";

export function TariffRowActions({ id, active }: { id: string; active: boolean }) {
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
    if (!confirm("Supprimer définitivement ce tarif ? Cette action est irréversible.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTariff(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={handleToggle}
          className={`h-8 rounded-lg px-2.5 text-[11px] font-bold disabled:opacity-60 ${
            active ? "bg-surface-sunken text-fg/70" : "bg-success-bg text-success"
          }`}
        >
          {active ? "Désactiver" : "Activer"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Supprimer"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-bg text-danger disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {error ? <p className="max-w-40 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
