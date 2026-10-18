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
  const [confirming, setConfirming] = useState(false);

  function executeToggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setAutoApprovalEnabled(next);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirming(false);
      }
      router.refresh();
    });
  }

  function handleToggleClick() {
    const next = !initialEnabled;
    if (next) {
      setConfirming(true);
    } else {
      executeToggle(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-sm font-extrabold text-white">Approbation automatique des inscriptions</p>
          <p className="mt-1 text-xs font-medium text-white/50">
            {initialEnabled
              ? "Activée — les nouvelles inscriptions sont immédiatement actives."
              : "Désactivée — les nouvelles inscriptions restent en attente d'approbation manuelle."}
          </p>
        </div>

        {confirming ? (
          <div className="flex flex-col gap-2 rounded-xl border border-brand-orange/40 bg-white/5 p-3 sm:w-72">
            <p className="text-xs font-bold text-white">
              Activer l&apos;approbation automatique ?
            </p>
            <p className="text-[11px] leading-relaxed text-white/60">
              Toute nouvelle inscription sera immédiatement active avec un abonnement d&apos;essai.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => executeToggle(true)}
                className="h-8 flex-1 rounded-lg bg-brand-orange text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleToggleClick}
            className={`h-10 shrink-0 rounded-xl px-4 text-xs font-extrabold disabled:opacity-60 ${
              initialEnabled ? "border border-white/15 text-white" : "bg-brand-orange text-ink"
            }`}
          >
            {pending ? "..." : initialEnabled ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>
      {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
