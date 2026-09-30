"use client";

import { useActionState, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import type { ExpenseFormState } from "@/lib/definitions";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "RENT", label: "Loyer" },
  { value: "ELECTRICITY", label: "Électricité" },
  { value: "WATER", label: "Eau" },
  { value: "INTERNET", label: "Internet" },
  { value: "CLEANING", label: "Nettoyage" },
  { value: "MAINTENANCE", label: "Entretien" },
  { value: "REPAIR", label: "Réparation" },
  { value: "SALARY", label: "Salaire" },
  { value: "PURCHASE", label: "Achat" },
  { value: "OTHER", label: "Autre" },
];

const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "OTHER", label: "Autre" },
];

export function ExpenseForm({
  action,
}: {
  action: (state: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("CASH");

  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="category" className="mb-1.5 block text-xs font-bold text-navy">
          Catégorie
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          <option value="">Sélectionner une catégorie...</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors?.category?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <Field id="amount" label="Montant (FCFA)" type="number" min={1} required errors={errors?.amount} />

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
          {METHOD_OPTIONS.map((m) => (
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

      <Field
        id="reference"
        label="Référence"
        type="text"
        placeholder="Ex. numéro de facture"
        errors={errors?.reference}
      />

      <TextAreaField
        id="note"
        label="Note"
        placeholder="Ex. Réparation climatiseur chambre 2"
        errors={errors?.note}
      />

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "ENREGISTRER LA DÉPENSE"}
      </button>
    </form>
  );
}
