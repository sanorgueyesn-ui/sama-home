"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPricingSettings } from "@/app/actions/platform-settings";
import type { PricingSettingsFormState } from "@/lib/definitions";

/**
 * Phase 3G / Lot D12-P103 — formulaire de configuration tarifaire globale.
 * Même schéma que AutoApprovalToggle (confirm() natif avant sauvegarde,
 * useTransition, erreurs affichées) — composant distinct, jamais une
 * modification du composant existant (hors périmètre explicite de ce lot).
 * Bornes affichées dans l'interface identiques à celles imposées côté
 * serveur par PricingSettingsSchema (src/lib/definitions.ts) — jamais une
 * validation uniquement côté client : setPricingSettings() revalide
 * indépendamment.
 */
export function PricingSettingsForm({
  initialTrialDurationMonths,
  initialPeriodMonths,
  initialPeriodPriceFcfa,
}: {
  initialTrialDurationMonths: number;
  initialPeriodMonths: number;
  initialPeriodPriceFcfa: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [trialDurationMonths, setTrialDurationMonths] = useState(String(initialTrialDurationMonths));
  const [periodMonths, setPeriodMonths] = useState(String(initialPeriodMonths));
  const [periodPriceFcfa, setPeriodPriceFcfa] = useState(String(initialPeriodPriceFcfa));
  const [state, setState] = useState<PricingSettingsFormState>({});
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setState({});
    const formData = new FormData();
    formData.set("trialDurationMonths", trialDurationMonths);
    formData.set("periodMonths", periodMonths);
    formData.set("periodPriceFcfa", periodPriceFcfa);
    startTransition(async () => {
      const result = await setPricingSettings({}, formData);
      setState(result);
      if (result.success) setSuccess(true);
      router.refresh();
    });
  }

  const errors = state.errors;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <p className="text-sm font-extrabold text-white">Tarification des abonnements</p>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-white/70">Durée d&apos;essai (1 à 12 mois)</span>
        <input
          type="number"
          min={1}
          max={12}
          value={trialDurationMonths}
          onChange={(e) => setTrialDurationMonths(e.target.value)}
          className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-brand-orange"
        />
        {errors?.trialDurationMonths ? (
          <span className="text-[10.5px] font-medium text-danger">{errors.trialDurationMonths[0]}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-white/70">Durée d&apos;une période payante (1 à 12 mois)</span>
        <input
          type="number"
          min={1}
          max={12}
          value={periodMonths}
          onChange={(e) => setPeriodMonths(e.target.value)}
          className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-brand-orange"
        />
        {errors?.periodMonths ? (
          <span className="text-[10.5px] font-medium text-danger">{errors.periodMonths[0]}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-white/70">Prix de la période (500 à 1 000 000 FCFA)</span>
        <input
          type="number"
          min={500}
          max={1000000}
          value={periodPriceFcfa}
          onChange={(e) => setPeriodPriceFcfa(e.target.value)}
          className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-brand-orange"
        />
        {errors?.periodPriceFcfa ? (
          <span className="text-[10.5px] font-medium text-danger">{errors.periodPriceFcfa[0]}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-xl bg-brand-orange px-4 text-xs font-extrabold text-ink disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>

      {state.message ? <p className="text-[10.5px] font-medium text-danger">{state.message}</p> : null}
      {success ? <p className="text-[10.5px] font-medium text-emerald-400">Réglages tarifaires enregistrés.</p> : null}

      <p className="text-[10.5px] font-medium text-white/40">
        N&apos;affecte jamais un abonnement ou une demande de paiement déjà créé — seules les prochaines
        approbations/demandes utiliseront ces valeurs.
      </p>
    </form>
  );
}
