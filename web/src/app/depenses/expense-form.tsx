"use client";

import { useActionState, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import type { ExpenseFormState } from "@/lib/definitions";
import { T, useT } from "@/components/i18n/i18n-provider";

const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "OTHER", label: "Autre" },
];

/**
 * Bloc 16.2, section 10 — les catégories viennent de la DB (actives
 * uniquement, voir listActiveExpenseCategories), plus de liste enum
 * statique. Le formulaire envoie toujours `categoryId`, jamais `category`
 * ni `categoryNameSnapshot` (ce dernier n'est dérivé que côté serveur,
 * depuis `category.name` au moment de la création — voir createExpense).
 */
export function ExpenseForm({
  action,
  categories,
}: {
  action: (state: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  categories: { id: string; name: string }[];
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [categoryId, setCategoryId] = useState("");
  const [method, setMethod] = useState("CASH");

  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="categoryId" className="mb-1.5 block text-xs font-bold text-app-text">
          <T>Catégorie</T>
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-12 w-full rounded-xl border border-app-line-strong bg-app-panel px-3 text-sm text-app-text outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <option value=""><T>Sélectionner une catégorie...</T></option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors?.categoryId?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            <T>{error}</T>
          </p>
        ))}
      </div>

      <Field id="amount" label="Montant (FCFA)" type="number" min={1} required errors={errors?.amount} />

      <div>
        <label htmlFor="method" className="mb-1.5 block text-xs font-bold text-app-text">
          <T>Mode de paiement</T>
        </label>
        <select
          id="method"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-12 w-full rounded-xl border border-app-line-strong bg-app-panel px-3 text-sm text-app-text outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              <T>{m.label}</T>
            </option>
          ))}
        </select>
        {errors?.method?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            <T>{error}</T>
          </p>
        ))}
      </div>

      <Field
        id="reference"
        label="Référence"
        type="text"
        placeholder={t("Ex. numéro de facture")}
        errors={errors?.reference}
      />

      <TextAreaField
        id="note"
        label="Note"
        placeholder={t("Ex. Réparation climatiseur chambre 2")}
        errors={errors?.note}
      />

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          <T>{state.message}</T>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : <T>{"ENREGISTRER LA DÉPENSE"}</T>}
      </button>
    </form>
  );
}
