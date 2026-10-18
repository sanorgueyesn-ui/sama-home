"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendEstablishment, reactivateEstablishment } from "@/app/actions/establishment-approval";

/**
 * Phase 3G / Lot D12-P92 — boutons de suspension/réactivation pour les
 * établissements `ACTIVE`/`SUSPENDED`, même schéma que
 * EstablishmentDecisionButtons (confirm() natif, useTransition, erreur
 * affichée) — composant distinct plutôt qu'une extension de
 * EstablishmentDecisionButtons : logiques et statuts cibles entièrement
 * différents (PENDING→ACTIVE/REJECTED ici vs ACTIVE→SUSPENDED→ACTIVE),
 * aucun état ni prop partagé entre les deux. N'appelle que
 * suspendEstablishment(id)/reactivateEstablishment(id) — aucune date, aucun
 * statut, aucune identité d'acteur transmis par ce composant.
 */
export function EstablishmentLifecycleButtons({
  establishmentId,
  establishmentName,
  status,
}: {
  establishmentId: string;
  establishmentName: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);

  function handleSuspend() {
    setError(null);
    startTransition(async () => {
      const result = await suspendEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmingSuspend(false);
      }
      router.refresh();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmingReactivate(false);
      }
      router.refresh();
    });
  }

  if (confirmingSuspend) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-danger/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Suspendre <span className="text-danger">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Son accès aux fonctionnalités métier sera immédiatement bloqué.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingSuspend(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSuspend}
            className="h-8 flex-1 rounded-lg border border-danger/30 bg-danger-bg text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Suspendre"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  if (confirmingReactivate) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-brand-orange/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Réactiver <span className="text-brand-orange">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Son accès dépendra de l&apos;état réel de son abonnement.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingReactivate(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleReactivate}
            className="h-8 flex-1 rounded-lg bg-brand-orange text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Réactiver"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "ACTIVE" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirmingSuspend(true);
            setConfirmingReactivate(false);
          }}
          className="h-9 rounded-xl border border-danger/40 px-3 text-xs font-extrabold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
        >
          Suspendre
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirmingReactivate(true);
            setConfirmingSuspend(false);
          }}
          className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Réactiver
        </button>
      )}
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
