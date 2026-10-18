"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveEstablishment, rejectEstablishment } from "@/app/actions/establishment-approval";

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
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setApproving(false);
      }
      router.refresh();
    });
  }

  function handleReject() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectEstablishment(establishmentId, trimmed);
      if (result.error) {
        setError(result.error);
      } else {
        setRejecting(false);
      }
      router.refresh();
    });
  }

  if (approving) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-brand-orange/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Approuver <span className="text-brand-orange">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Un abonnement d&apos;essai de 2 mois sera activé pour cet établissement.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setApproving(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleApprove}
            className="h-8 flex-1 rounded-lg bg-brand-orange text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Approuver"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-64">
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
          onClick={() => {
            setRejecting(true);
            setApproving(false);
          }}
          className="h-9 rounded-xl border border-white/15 px-3 text-xs font-extrabold text-white hover:bg-white/5 disabled:opacity-60"
        >
          Refuser
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setApproving(true);
            setRejecting(false);
          }}
          className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "..." : "Approuver"}
        </button>
      </div>
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
