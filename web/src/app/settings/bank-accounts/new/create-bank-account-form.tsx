"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankAccount } from "@/app/actions/bank";

/**
 * Bloc F, section 7 — appelle directement l'action existante
 * (src/app/actions/bank.ts, gelée), aucune validation métier dupliquée.
 * Section 4 — rappel explicite : jamais de numéro de compte complet.
 */
export function CreateBankAccountForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [bankName, setBankName] = useState("");
  const [maskedAccountNumber, setMaskedAccountNumber] = useState("");
  const [errors, setErrors] = useState<{ label?: string; bankName?: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors(null);
    setMessage(null);
    if (!label.trim() || !bankName.trim()) {
      setErrors({
        label: label.trim() ? undefined : "Le libellé est obligatoire.",
        bankName: bankName.trim() ? undefined : "La banque est obligatoire.",
      });
      return;
    }
    startTransition(async () => {
      const result = await createBankAccount({
        label: label.trim(),
        bankName: bankName.trim(),
        maskedAccountNumber: maskedAccountNumber.trim() || undefined,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.errors) {
        setErrors({ label: result.errors.label?.[0], bankName: result.errors.bankName?.[0] });
        return;
      }
      router.push("/settings/bank-accounts?done=created");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="label" className="mb-1.5 block text-xs font-bold text-fg">
          Libellé
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. Compte principal"
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        {errors?.label ? <p className="mt-1 text-xs font-medium text-danger">{errors.label}</p> : null}
      </div>

      <div>
        <label htmlFor="bankName" className="mb-1.5 block text-xs font-bold text-fg">
          Banque
        </label>
        <input
          id="bankName"
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="Ex. Ecobank"
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        {errors?.bankName ? <p className="mt-1 text-xs font-medium text-danger">{errors.bankName}</p> : null}
      </div>

      <div>
        <label htmlFor="maskedAccountNumber" className="mb-1.5 block text-xs font-bold text-fg">
          Numéro de compte <span className="font-medium text-fg/40">(optionnel, masqué)</span>
        </label>
        <input
          id="maskedAccountNumber"
          type="text"
          value={maskedAccountNumber}
          onChange={(e) => setMaskedAccountNumber(e.target.value)}
          placeholder="Ex. •••• 4821"
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        <p className="mt-1 text-[11px] font-medium text-fg/40">
          Ne jamais saisir le numéro complet — uniquement une référence masquée.
        </p>
      </div>

      {message ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/settings/bank-accounts")}
          disabled={pending}
          className="h-14 flex-1 rounded-2xl border border-border/15 text-base font-extrabold text-fg disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-14 flex-1 rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
        >
          {pending ? "..." : "Créer"}
        </button>
      </div>
    </form>
  );
}
