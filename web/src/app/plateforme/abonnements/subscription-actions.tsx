"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { prolongSubscriptionAction, recordManualSubscriptionPaymentAction } from "@/app/actions/subscription";

export function SubscriptionActions({
  establishmentId,
  establishmentName,
}: {
  establishmentId: string;
  establishmentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amount, setAmount] = useState("9900");
  const [months, setMonths] = useState("3");
  const [reference, setReference] = useState("");

  function handleQuickProlong(days: number) {
    if (pending) return;
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await prolongSubscriptionAction(
        establishmentId,
        days,
        `Prolongation rapide (+${days}j) accordée par l'administrateur.`
      );
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(`+${days} jours appliqués`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
      router.refresh();
    });
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setSuccessMsg(null);

    const numAmount = parseInt(amount, 10);
    const numMonths = parseInt(months, 10);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Montant invalide");
      return;
    }
    if (isNaN(numMonths) || numMonths <= 0) {
      setError("Nombre de mois invalide");
      return;
    }

    startTransition(async () => {
      const res = await recordManualSubscriptionPaymentAction(
        establishmentId,
        numAmount,
        numMonths,
        reference.trim() || undefined
      );
      if (res.error) {
        setError(res.error);
      } else {
        setShowPaymentModal(false);
        setReference("");
        setSuccessMsg("Paiement validé avec succès !");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
      <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:items-center">
        <button
          type="button"
          disabled={pending}
          onClick={() => handleQuickProlong(30)}
          title="Offrir ou ajouter 30 jours de validité"
          className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/80 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
        >
          {pending ? "..." : "+30 j"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => handleQuickProlong(90)}
          title="Ajouter 90 jours (3 mois)"
          className="flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white/80 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
        >
          {pending ? "..." : "+3 mois"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setShowPaymentModal(true);
          }}
          className="flex h-9 items-center justify-center rounded-xl bg-brand-orange/15 px-2.5 py-1 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-ink disabled:opacity-40"
        >
          Encaisser
        </button>
      </div>

      {successMsg ? (
        <span className="text-center text-[10.5px] font-semibold text-emerald-400 animate-pulse sm:text-right">{successMsg}</span>
      ) : null}

      {error ? (
        <span className="text-center text-[10.5px] font-medium text-danger sm:text-right">{error}</span>
      ) : null}

      {/* Modal / Dialog d'enregistrement de règlement manuel */}
      {showPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0e1a22] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Enregistrer un règlement</h3>
                <p className="mt-0.5 text-xs text-white/60">
                  Établissement : <strong className="text-brand-orange">{establishmentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Montant encaissé (FCFA)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white placeholder-white/30 focus:border-brand-orange focus:outline-none"
                  placeholder="9900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Durée de validité accordée (Mois)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white placeholder-white/30 focus:border-brand-orange focus:outline-none"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Référence de transaction / Justificatif (Wave, OM, etc.)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-orange focus:outline-none"
                  placeholder="Ex : Wave TX-892183 ou Espèces reçues"
                />
              </div>

              {error ? (
                <div className="rounded-xl bg-danger-bg px-3 py-2 text-xs font-semibold text-danger">
                  {error}
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-extrabold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {pending ? "Validation en cours..." : "Valider & Activer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
