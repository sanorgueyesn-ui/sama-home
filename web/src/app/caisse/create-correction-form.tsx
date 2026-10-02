"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashCorrection } from "@/app/actions/cash";

/** Bloc E, section 14 — ADMIN uniquement (masquage côté parent, revérifié serveur). Pas de modification/suppression d'une correction existante. */
export function CreateCorrectionForm() {
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
        className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
      >
        + Correction de caisse
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-navy/15 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-navy">Correction de caisse</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-navy/50 underline">
          Annuler
        </button>
      </div>
      <p className="rounded-xl bg-warning-bg px-3 py-2.5 text-xs font-medium text-warning">
        Une correction est une opération exceptionnelle et traçable.
      </p>
      <div>
        <label htmlFor="correctionAmount" className="mb-1.5 block text-xs font-bold text-navy">
          Montant (FCFA, signé)
        </label>
        <input
          id="correctionAmount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex. 5000 ou -5000"
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
      </div>
      <div>
        <label htmlFor="correctionReason" className="mb-1.5 block text-xs font-bold text-navy">
          Justification
        </label>
        <textarea
          id="correctionReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-20 w-full resize-none rounded-xl border border-navy/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-navy"
        />
      </div>
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="h-12 flex-1 rounded-xl border border-navy/15 text-sm font-extrabold text-navy disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="h-12 flex-1 rounded-xl bg-navy text-sm font-extrabold text-white disabled:opacity-40"
        >
          {pending ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
