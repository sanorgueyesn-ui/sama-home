"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmSubscriptionPayment } from "@/app/actions/subscription";

export function ConfirmPaymentButton({
  paymentId,
  establishmentName,
}: {
  paymentId: string;
  establishmentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmSubscriptionPayment(paymentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirming(false);
      }
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-brand-orange/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Confirmer le paiement de <span className="text-brand-orange">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Cette action prolongera immédiatement son abonnement.
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
            onClick={handleConfirm}
            className="h-8 flex-1 rounded-lg bg-brand-orange text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Valider"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Confirmation..." : "Confirmer le paiement"}
      </button>
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
