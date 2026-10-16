"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmSubscriptionPayment } from "@/app/actions/subscription";

/**
 * Phase 3G / Lot D12-P60 — même schéma que BankAccountRowActions/
 * TariffRowActions (confirm() natif avant une opération financière,
 * useTransition pour désactiver le bouton pendant l'appel, useState pour
 * l'erreur). N'appelle que confirmSubscriptionPayment(paymentId) — aucun
 * montant, durée, date ou confirmateur n'est jamais transmis par ce
 * composant : ces valeurs sont résolues et calculées exclusivement côté
 * serveur par l'action elle-même (D12-P59), jamais dupliquées ici.
 *
 * Le clic ou la disparition de la ligne après `router.refresh()` ne sont
 * JAMAIS traités comme une preuve de confirmation — seul `result.error`
 * absent après l'appel réel à l'action indique un succès ; en cas de
 * conflit (ex. déjà traitée par quelqu'un d'autre), le message exact
 * retourné par l'action est affiché, et la liste est actualisée dans tous
 * les cas pour refléter l'état réel en base.
 */
export function ConfirmPaymentButton({ paymentId, establishmentName }: { paymentId: string; establishmentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (
      !confirm(
        `Confirmer le paiement de « ${establishmentName} » ? Cette action prolongera immédiatement son abonnement et ne peut pas être annulée depuis cette interface.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await confirmSubscriptionPayment(paymentId);
      if (result.error) {
        setError(result.error);
      }
      // Actualisation systématique, succès comme échec : la liste doit
      // toujours refléter l'état réel en base (ex. une demande déjà traitée
      // par un autre administrateur disparaît de la liste même si CETTE
      // tentative a échoué).
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleConfirm}
        className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink disabled:opacity-60"
      >
        {pending ? "Confirmation..." : "Confirmer le paiement"}
      </button>
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
