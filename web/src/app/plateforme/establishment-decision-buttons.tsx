"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveEstablishment, rejectEstablishment } from "@/app/actions/establishment-approval";

/**
 * Phase 3G / Lot D12-P82 — même schéma que ConfirmPaymentButton
 * (confirm() natif avant approbation, useTransition, erreur affichée).
 * Le refus exige un motif non vide : le bouton "Confirmer le refus" reste
 * désactivé tant que le champ est vide côté client, ET l'action serveur
 * revalide indépendamment (jamais une validation uniquement côté client).
 * N'appelle que approveEstablishment(id)/rejectEstablishment(id, reason) —
 * aucune date, aucun statut, aucune identité d'approbateur transmis par ce
 * composant.
 */
export function EstablishmentDecisionButtons({
  establishmentId,
  establishmentName,
}: {
  establishmentId: string;
  establishmentName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    if (
      !confirm(
        `Approuver « ${establishmentName} » ? Un abonnement d'essai sera immédiatement activé pour cet établissement.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await approveEstablishment(establishmentId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  function handleReject() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    if (!confirm(`Refuser « ${establishmentName} » ? Cette action ne peut pas être annulée depuis cette interface.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectEstablishment(establishmentId, trimmed);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  if (rejecting) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-56">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif du refus (obligatoire)"
          rows={2}
          disabled={pending}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-danger focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-60"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setReason("");
              setError(null);
            }}
            className="h-8 flex-1 rounded-lg border border-white/15 text-[11px] font-bold text-white disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={handleReject}
            className="h-8 flex-1 rounded-lg bg-danger-bg text-[11px] font-bold text-danger disabled:opacity-40"
          >
            {pending ? "..." : "Confirmer le refus"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setRejecting(true)}
          className="h-9 rounded-xl border border-white/15 px-3 text-xs font-extrabold text-white disabled:opacity-60"
        >
          Refuser
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleApprove}
          className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink disabled:opacity-60"
        >
          {pending ? "..." : "Approuver"}
        </button>
      </div>
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
