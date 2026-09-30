"use client";

import { useActionState, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import type { ClientFormState } from "@/lib/definitions";

const ID_DOCUMENT_SUGGESTIONS = [
  "CNI",
  "Passeport",
  "Permis de conduire",
  "Carte consulaire",
];

type ClientFormValues = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  idDocumentType?: string;
  idDocumentNumber?: string;
  notes?: string;
};

export function ClientForm({
  action,
  defaultValues,
  submitLabel,
  returnTo,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaultValues?: ClientFormValues;
  submitLabel: string;
  /** Phase 12, Bloc 6 — see actions/clients.ts's safeReturnTo() for the server-side allowlist. */
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [idDocumentType, setIdDocumentType] = useState(defaultValues?.idDocumentType ?? "");
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <Field
        id="name"
        label="Nom du client"
        required
        defaultValue={defaultValues?.name}
        errors={errors?.name}
        placeholder="Ex. Moussa Diop"
      />
      <Field
        id="phone"
        label="Téléphone"
        required
        type="tel"
        defaultValue={defaultValues?.phone}
        errors={errors?.phone}
        hint="Les espaces sont retirés automatiquement."
        placeholder="Ex. +221 77 000 00 00"
      />
      <Field
        id="email"
        label="Email"
        type="email"
        defaultValue={defaultValues?.email}
        errors={errors?.email}
        placeholder="Ex. client@exemple.com"
      />
      <Field
        id="address"
        label="Adresse"
        defaultValue={defaultValues?.address}
        errors={errors?.address}
        placeholder="Ex. Sacré-Cœur 3, Dakar"
      />

      <div>
        <label className="mb-1.5 block text-xs font-bold text-navy">
          Type de pièce <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {ID_DOCUMENT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setIdDocumentType(suggestion)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                idDocumentType === suggestion
                  ? "bg-navy text-white"
                  : "bg-paper text-navy"
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <input
          id="idDocumentType"
          name="idDocumentType"
          value={idDocumentType}
          onChange={(e) => setIdDocumentType(e.target.value)}
          placeholder="Ou saisir un autre type"
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
        {errors?.idDocumentType?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <Field
        id="idDocumentNumber"
        label="Numéro de pièce"
        defaultValue={defaultValues?.idDocumentNumber}
        errors={errors?.idDocumentNumber}
      />
      <TextAreaField
        id="notes"
        label="Notes"
        defaultValue={defaultValues?.notes}
        errors={errors?.notes}
        placeholder="Informations complémentaires (facultatif)"
      />

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : submitLabel}
      </button>
    </form>
  );
}
