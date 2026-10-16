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

  function handleSuspend() {
    if (!confirm(`Suspendre « ${establishmentName} » ? Son accès aux fonctionnalités métier sera immédiatement bloqué.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await suspendEstablishment(establishmentId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  function handleReactivate() {
    if (
      !confirm(
        `Réactiver « ${establishmentName} » ? Son accès aux fonctionnalités métier dépendra ensuite de l'état réel de son abonnement — la réactivation ne prolonge ni ne renouvelle celui-ci.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reactivateEstablishment(establishmentId);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "ACTIVE" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleSuspend}
          className="h-9 rounded-xl border border-danger/40 px-3 text-xs font-extrabold text-danger disabled:opacity-60"
        >
          {pending ? "..." : "Suspendre"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={handleReactivate}
          className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink disabled:opacity-60"
        >
          {pending ? "..." : "Réactiver"}
        </button>
      )}
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
