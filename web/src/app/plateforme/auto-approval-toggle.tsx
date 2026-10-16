"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutoApprovalEnabled } from "@/app/actions/platform-settings";

/**
 * Phase 3G / Lot D12-P88 — bascule du mode d'approbation automatique.
 * Confirmation explicite avant ACTIVATION uniquement (conséquence réelle :
 * les prochaines inscriptions seront immédiatement actives, abonnement
 * d'essai compris) — la désactivation, qui ne fait que réduire un risque
 * futur sans jamais toucher aux établissements déjà créés, ne l'exige pas
 * (même principe que la distinction activer/désactiver déjà établie pour
 * `toggleActive()`/`toggleTariffActive()` dans ce projet).
 */
export function AutoApprovalToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !initialEnabled;
    if (next) {
      if (
        !confirm(
          "Activer l'approbation automatique ? Toute nouvelle inscription sera immédiatement active, avec un abonnement d'essai créé sans intervention humaine.",
        )
      ) {
        return;
      }
    }
    setError(null);
    startTransition(async () => {
      const result = await setAutoApprovalEnabled(next);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-sm font-extrabold text-white">Approbation automatique des inscriptions</p>
          <p className="mt-1 text-xs font-medium text-white/50">
            {initialEnabled
              ? "Activée — les nouvelles inscriptions sont immédiatement actives."
              : "Désactivée — les nouvelles inscriptions restent en attente d'approbation manuelle."}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={handleToggle}
          className={`h-10 shrink-0 rounded-xl px-4 text-xs font-extrabold disabled:opacity-60 ${
            initialEnabled ? "border border-white/15 text-white" : "bg-brand-orange text-ink"
          }`}
        >
          {pending ? "..." : initialEnabled ? "Désactiver" : "Activer"}
        </button>
      </div>
      {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
