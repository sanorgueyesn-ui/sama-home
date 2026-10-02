"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { effectBankTransfer, cancelBankTransfer } from "@/app/actions/bank";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * Bloc G, sections 11/12 — appelle uniquement les actions serveur
 * existantes (gelées, src/app/actions/bank.ts). `canEffect`/`canCancel`
 * reflètent exactement la logique déjà dans `effectBankTransfer`/
 * `cancelBankTransfer` : refusé seulement si déjà EFFECTED (les deux) ou
 * déjà CANCELLED (annulation, idempotente côté serveur) — jamais une
 * règle UI inventée en plus de ce que le serveur applique déjà.
 */
export function BankTransferRowActions({
  id,
  status,
  amount,
  accountLabel,
}: {
  id: string;
  status: string;
  amount: number;
  accountLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canEffect = status === "DRAFT" || status === "SCHEDULED";
  const canCancel = status === "DRAFT" || status === "SCHEDULED";

  function handleEffect() {
    if (!confirm(`Confirmer l'effectuation de ce virement de ${fmtFcfa(amount)} vers ${accountLabel} ?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await effectBankTransfer(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm("Voulez-vous vraiment annuler ce virement ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelBankTransfer(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!canEffect && !canCancel) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {canEffect ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleEffect}
            className="h-10 flex-1 rounded-xl bg-navy text-xs font-extrabold text-white disabled:opacity-40"
          >
            {pending ? "..." : "Effectuer le virement"}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleCancel}
            className="h-10 flex-1 rounded-xl border border-danger/30 bg-danger-bg text-xs font-extrabold text-danger disabled:opacity-40"
          >
            {pending ? "..." : "Annuler"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
