"use client";

import { useActionState, useState } from "react";
import type { PaymentFormState } from "@/lib/definitions";

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "OTHER", label: "Autre" },
];

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/** Bloc 13/14 — shared "Encaisser" form, used from both a réservation and a location. */
export function PaymentForm({
  action,
  remaining,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  remaining: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const errors = state?.errors;
  const amountValid = amount > 0 && amount <= remaining;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="rounded-xl bg-paper px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy/60">Reste à payer</span>
          <span className="text-base font-extrabold text-navy">{fmtFcfa(remaining)}</span>
        </div>
      </div>

      <div>
        <label htmlFor="amount" className="mb-1.5 block text-xs font-bold text-navy">
          Montant encaissé (FCFA)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={1}
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        />
        {!amountValid ? (
          <p className="mt-1 text-xs font-medium text-danger">
            Le montant doit être compris entre 1 et {fmtFcfa(remaining)}.
          </p>
        ) : null}
        {errors?.amount?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="method" className="mb-1.5 block text-xs font-bold text-navy">
          Mode de paiement
        </label>
        <select
          id="method"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          {PAYMENT_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors?.method?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="reference" className="mb-1.5 block text-xs font-bold text-navy">
          Référence <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        </label>
        <input
          id="reference"
          name="reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex. identifiant de transaction Wave"
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        />
        {errors?.reference?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-xs font-bold text-navy">
          Note <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        </label>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Informations complémentaires"
          className="min-h-20 w-full resize-none rounded-xl border border-navy/15 bg-paper px-4 py-3 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !amountValid}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "CONFIRMER L'ENCAISSEMENT"}
      </button>
    </form>
  );
}
