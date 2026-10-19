"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, TextAreaField } from "@/components/ui/field";
import type { ClientFormState } from "@/lib/definitions";
import { AlertCircleIcon } from "@/components/ui/icons";

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

  // Audit Client/Réservation, Bloc 3/5/11 — un client court séjour n'a besoin
  // que de Nom + Téléphone (voir Bloc 3). Les autres champs (email, adresse,
  // pièce d'identité, notes) restent accessibles mais repliés par défaut pour
  // ne pas imposer un formulaire long. Repliés par défaut sauf si le client
  // édité possède déjà l'une de ces informations (fiche existante à modifier).
  const hasSecondaryData = Boolean(
    defaultValues?.email ||
      defaultValues?.address ||
      defaultValues?.idDocumentType ||
      defaultValues?.idDocumentNumber ||
      defaultValues?.notes,
  );
  const [showMore, setShowMore] = useState(hasSecondaryData);

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

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1.5 self-start text-xs font-bold text-fg underline"
        aria-expanded={showMore}
      >
        {showMore ? "− Masquer les informations complémentaires" : "+ Informations complémentaires"}
      </button>

      {/* Toujours montés (jamais démontés) pour qu'un champ rempli puis
          replié ne perde jamais sa valeur saisie — seule la visibilité
          change, via `hidden` plutôt qu'un rendu conditionnel. */}
      <div className={`flex flex-col gap-4 ${showMore ? "" : "hidden"}`}>
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
          <label className="mb-1.5 block text-xs font-bold text-fg">
            Type de pièce <span className="ml-1 font-medium text-fg/40">(optionnel)</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {ID_DOCUMENT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setIdDocumentType(suggestion)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                  idDocumentType === suggestion ? "bg-navy text-white" : "bg-surface-raised text-fg"
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
            className="h-12 w-full rounded-xl border border-border/15 bg-surface-raised px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
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
      </div>

      {state?.message && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs font-bold text-rose-300 flex items-center gap-1.5">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{state.message}</span>
        </p>
      )}

      {/* Boutons d'action divisés */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href={returnTo || "/clients"}
          className="flex h-13 min-w-[120px] items-center justify-center rounded-2xl border border-white/15 bg-surface text-sm font-bold text-fg hover:bg-white/5 active:scale-98 transition-all"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 h-13 rounded-2xl bg-brand-orange text-sm font-black text-ink shadow-lg shadow-brand-orange/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
        >
          {pending ? "Enregistrement..." : `👤 ${submitLabel}`}
        </button>
      </div>
    </form>
  );
}
