"use client";

import { useState, useTransition } from "react";
import { startPaydunyaCheckout } from "@/app/actions/paydunya-checkout";
import { T } from "@/components/i18n/i18n-provider";

export type OnlineOffer = {
  tier: "ESSENTIAL" | "PRO" | "PREMIUM";
  name: string;
  monthlyFcfa: number;
  annualFcfa: number;
  units: string;
  users: string;
  features: string[];
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;

/** Choix de la formule et paiement en ligne (Wave, Orange Money, carte…) via PayDunya. */
export function PayOnlineForm({ offers, currentTier }: { offers: OnlineOffer[]; currentTier: OnlineOffer["tier"] | null }) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);

  function pay(tier: OnlineOffer["tier"]) {
    setError(null);
    setChosen(tier);
    startTransition(async () => {
      const result = await startPaydunyaCheckout(tier, cycle);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? "Une erreur est survenue.");
      setChosen(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Durée" className="inline-flex self-start rounded-full border border-app-line-strong p-0.5 text-xs font-bold">
        {(["monthly", "annual"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={cycle === value}
            onClick={() => setCycle(value)}
            className={`h-9 rounded-full px-4 ${cycle === value ? "bg-brand-orange text-ink" : "text-app-text-2"}`}
          >
            <T>{value === "monthly" ? "Mensuel" : "Annuel (12 mois pour le prix de 11)"}</T>
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {offers.map((offer) => (
          <li key={offer.tier} className="flex flex-col gap-2 rounded-2xl border border-app-line-strong p-3">
            <p className="text-sm font-extrabold text-app-text">
              <T>{offer.name}</T>
              {currentTier === offer.tier ? <span className="ms-2 text-[10px] font-bold text-brand-orange"><T>Formule actuelle</T></span> : null}
            </p>
            <p className="text-lg font-extrabold text-app-text">
              {fmt(cycle === "annual" ? offer.annualFcfa : offer.monthlyFcfa)}
              <span className="ms-1 text-xs font-medium text-app-muted">{cycle === "annual" ? <T>/ an</T> : <T>/ mois</T>}</span>
            </p>
            <p className="text-[11px] font-medium text-app-muted"><T>{offer.units}</T> · <T>{offer.users}</T></p>
            <ul className="mt-2 space-y-0.5 text-[11px] font-medium text-app-text-2">
              {offer.features.map((f) => (
                <li key={f}>✓ <T>{f}</T></li>
              ))}
            </ul>
            <button
              type="button"
              disabled={pending}
              onClick={() => pay(offer.tier)}
              className="mt-auto h-11 rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-60"
            >
              {pending && chosen === offer.tier ? <T>{"Redirection vers le paiement..."}</T> : <T>{"Payer en ligne"}</T>}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="text-xs font-medium text-danger"><T>{error}</T></p> : null}
      <p className="text-[10.5px] font-medium text-app-muted">
        <T>Le paiement se fait sur la page sécurisée PayDunya. SAMA HOME ne voit ni ne conserve aucun numéro de carte. L&apos;abonnement est prolongé dès que PayDunya confirme le paiement.</T>
      </p>
    </div>
  );
}
