"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashCorrection } from "@/app/actions/cash";
import { T, useT } from "@/components/i18n/i18n-provider";

/** Bloc E, section 14 — ADMIN uniquement (masquage côté parent, revérifié serveur). Pas de modification/suppression d'une correction existante. */
export function CreateCorrectionForm() {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const parsed = Number(amount);
    if (amount.trim().length === 0 || !Number.isInteger(parsed) || parsed === 0) {
      setError("Le montant doit être un nombre entier non nul (positif ou négatif).");
      return;
    }
    if (!reason.trim()) {
      setError("Une justification est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCashCorrection(parsed, reason.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 items-center justify-center rounded-xl border border-border/15 text-sm font-extrabold text-fg"
      >
        <T>+ Correction de caisse</T>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/15 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-fg"><T>Correction de caisse</T></p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-fg/50 underline">
          <T>Annuler</T>
        </button>
      </div>
      <p className="rounded-xl bg-warning-bg px-3 py-2.5 text-xs font-medium text-warning">
        <T>Une correction est une opération exceptionnelle et traçable.</T>
      </p>
      <div>
        <label htmlFor="correctionAmount" className="mb-1.5 block text-xs font-bold text-fg">
          <T>Montant (FCFA, signé)</T>
        </label>
        <input
          id="correctionAmount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t("Ex. 5000 ou -5000")}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>
      <div>
        <label htmlFor="correctionReason" className="mb-1.5 block text-xs font-bold text-fg">
          <T>Justification</T>
        </label>
        <textarea
          id="correctionReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-20 w-full resize-none rounded-xl border border-border/15 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>
      {error ? <p className="text-xs font-medium text-danger"><T>{error}</T></p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="h-12 flex-1 rounded-xl border border-border/15 text-sm font-extrabold text-fg disabled:opacity-60"
        >
          <T>Annuler</T>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="h-12 flex-1 rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
        >
          {pending ? "..." : <T>{"Enregistrer"}</T>}
        </button>
      </div>
    </div>
  );
}
