"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankTransfer } from "@/app/actions/bank";

/**
 * Bloc G, sections 9/10 — appelle directement l'action existante
 * (createBankTransfer, gelée) ; aucune validation métier dupliquée, aucun
 * accès direct à la base. `status` : "SCHEDULED" si une date prévue est
 * renseignée, sinon "DRAFT" — l'action ne prévoit que ces deux statuts à
 * la création (jamais EFFECTED à la création, voir section 10 : créer un
 * virement ne signifie jamais qu'il est effectué).
 */
export function CreateBankTransferForm({ accounts }: { accounts: { id: string; label: string; bankName: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!bankAccountId) {
      setError("Le compte bancaire est obligatoire.");
      return;
    }
    if (amount.trim().length === 0 || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Le montant doit être un nombre entier strictement positif.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createBankTransfer({
        bankAccountId,
        amount: parsedAmount,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/caisse/virements?done=created");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="bankAccountId" className="mb-1.5 block text-xs font-bold text-navy">
          Compte bancaire
        </label>
        <select
          id="bankAccountId"
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          <option value="">Sélectionner un compte...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} · {a.bankName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="mb-1.5 block text-xs font-bold text-navy">
          Montant (FCFA)
        </label>
        <input
          id="amount"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      <div>
        <label htmlFor="scheduledAt" className="mb-1.5 block text-xs font-bold text-navy">
          Date prévue <span className="font-medium text-navy/40">(optionnel — laisser vide pour un brouillon)</span>
        </label>
        <input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      <div>
        <label htmlFor="reference" className="mb-1.5 block text-xs font-bold text-navy">
          Référence <span className="font-medium text-navy/40">(optionnel)</span>
        </label>
        <input
          id="reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex. numéro de bordereau"
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-xs font-bold text-navy">
          Note <span className="font-medium text-navy/40">(optionnel)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-20 w-full resize-none rounded-xl border border-navy/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      <p className="rounded-xl bg-paper px-4 py-3 text-xs font-medium text-navy/60">
        Un virement bancaire transfère de l&apos;argent de la caisse vers la banque. Il ne constitue pas une dépense.
      </p>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/caisse/virements")}
          disabled={pending}
          className="h-14 flex-1 rounded-2xl border border-navy/15 text-base font-extrabold text-navy disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-14 flex-1 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
        >
          {pending ? "..." : "Créer"}
        </button>
      </div>
    </form>
  );
}
