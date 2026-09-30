"use client";

import { useActionState, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import type { PropertyFormState } from "@/lib/definitions";

type PropertyFormValues = {
  name?: string;
  type?: "ROOM" | "APARTMENT";
  description?: string;
  capacity?: number;
  photo?: string;
  active?: boolean;
};

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
  showActiveToggle,
}: {
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  defaultValues?: PropertyFormValues;
  submitLabel: string;
  showActiveToggle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<"ROOM" | "APARTMENT">(defaultValues?.type ?? "ROOM");
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-navy">Type de logement</label>
        <input type="hidden" name="type" value={type} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("ROOM")}
            className={`h-11 flex-1 rounded-xl text-sm font-bold ${
              type === "ROOM" ? "bg-navy text-white" : "border border-navy/15 bg-white text-navy"
            }`}
          >
            Chambre
          </button>
          <button
            type="button"
            onClick={() => setType("APARTMENT")}
            className={`h-11 flex-1 rounded-xl text-sm font-bold ${
              type === "APARTMENT" ? "bg-navy text-white" : "border border-navy/15 bg-white text-navy"
            }`}
          >
            Appartement
          </button>
        </div>
        {errors?.type?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <Field
        id="name"
        label="Nom du logement"
        required
        defaultValue={defaultValues?.name}
        errors={errors?.name}
        placeholder="Ex. Chambre 01"
      />
      <Field
        id="capacity"
        label="Capacité (personnes)"
        required
        type="number"
        min={1}
        max={50}
        defaultValue={defaultValues?.capacity}
        errors={errors?.capacity}
        placeholder="Ex. 2"
      />
      <TextAreaField
        id="description"
        label="Description"
        defaultValue={defaultValues?.description}
        errors={errors?.description}
        placeholder="Détails complémentaires (facultatif)"
      />
      <Field
        id="photo"
        label="Photo"
        type="url"
        defaultValue={defaultValues?.photo}
        errors={errors?.photo}
        hint="Lien vers une image déjà en ligne (aucun envoi de fichier en V1)."
        placeholder="https://..."
      />

      {showActiveToggle ? (
        <label className="flex items-center gap-2.5 text-sm font-bold text-navy">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaultValues?.active ?? true}
            className="h-4 w-4 accent-navy"
          />
          Logement actif (visible et proposable)
        </label>
      ) : null}

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
