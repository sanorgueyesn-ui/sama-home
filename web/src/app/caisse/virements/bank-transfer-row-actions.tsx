"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { effectBankTransfer, cancelBankTransfer } from "@/app/actions/bank";
import { useConfirm } from "@/components/ui/use-confirm";
import { T, useT } from "@/components/i18n/i18n-provider";

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
  const t = useT();
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canEffect = status === "DRAFT" || status === "SCHEDULED";
  const canCancel = status === "DRAFT" || status === "SCHEDULED";

  async function handleEffect() {
    const ok = await askConfirm({
      title: "Effectuer ce virement ?",
      message: t(`Confirmer l'effectuation de ce virement de ${fmtFcfa(amount)} vers ${accountLabel} ?`),
      confirmLabel: "Effectuer le virement",
    });
    if (!ok) return;
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

  async function handleCancel() {
    const ok = await askConfirm({
      title: "Annuler ce virement ?",
      message: t("Voulez-vous vraiment annuler ce virement ?"),
      confirmLabel: "Annuler le virement",
      danger: true,
    });
    if (!ok) return;
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
      {confirmDialog}
      <div className="flex gap-2">
        {canEffect ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleEffect}
            className="h-10 flex-1 rounded-xl bg-brand-orange text-xs font-extrabold text-ink disabled:opacity-40"
          >
            {pending ? "..." : <T>{"Effectuer le virement"}</T>}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleCancel}
            className="h-10 flex-1 rounded-xl border border-danger/30 bg-danger-bg text-xs font-extrabold text-danger disabled:opacity-40"
          >
            {pending ? "..." : <T>{"Annuler"}</T>}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs font-medium text-danger"><T>{error}</T></p> : null}
    </div>
  );
}
