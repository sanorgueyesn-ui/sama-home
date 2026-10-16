"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubscriptionPaymentRequest } from "@/app/actions/subscription";

/**
 * Phase 3G / Lot D12-P58 — même schéma que TariffRowActions/
 * BankAccountRowActions (useTransition + useState pour l'erreur, bouton
 * désactivé pendant l'envoi). Pas de champ de montant/durée/statut : ces
 * valeurs sont déjà résolues côté serveur par createSubscriptionPaymentRequest()
 * (PricingSettings), jamais choisies ici — seul `reference` (justificatif
 * libre, optionnel) est un champ réellement soumis.
 *
 * Après succès, `router.refresh()` relit la page serveur : celle-ci bascule
 * alors sur la branche "demande en attente" (voir page.tsx), qui affiche
 * explicitement le montant/durée/date de LA demande réellement enregistrée
 * — cette bascule sert elle-même de confirmation explicite, sans jamais
 * affirmer qu'un paiement a été confirmé (aucun mot "confirmé" n'apparaît
 * dans ce composant).
 */
export function RequestRenewalForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createSubscriptionPaymentRequest(reference.trim() || undefined);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="subscription-reference" className="text-xs font-bold text-fg">
        Référence de paiement <span className="font-medium text-fg/40">(optionnel)</span>
      </label>
      <input
        id="subscription-reference"
        type="text"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        disabled={pending}
        placeholder="Ex. référence de virement ou de mobile money"
        className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange disabled:opacity-60"
      />
      <p className="text-[10.5px] font-medium text-fg/50">
        Ne saisissez jamais de numéro de carte bancaire ni aucun autre secret ici — un simple justificatif (référence
        de virement, numéro de transaction mobile money) suffit.
      </p>
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={handleSubmit}
        className="mt-1 h-12 rounded-2xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-60"
      >
        {pending ? "Envoi en cours..." : "Demander un renouvellement"}
      </button>
    </div>
  );
}
