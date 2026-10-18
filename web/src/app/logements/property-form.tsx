"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import type { PropertyFormState } from "@/lib/definitions";

type PropertyFormValues = {
  name?: string;
  type?: "ROOM" | "APARTMENT";
  description?: string;
  capacity?: number;
  /** URL d'affichage déjà résolue par la page (présignée ou héritée) — jamais la clé brute du bucket. */
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
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const errors = state?.errors;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setNewPhotoPreview(url);
      setRemovePhoto(false);
    } else {
      setNewPhotoPreview(null);
    }
  }

  const currentPhoto = defaultValues?.photo ?? null;
  const previewToShow = newPhotoPreview ?? (removePhoto ? null : currentPhoto);

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-fg">Type de logement</label>
        <input type="hidden" name="type" value={type} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("ROOM")}
            aria-pressed={type === "ROOM"}
            className={`h-11 flex-1 rounded-xl text-sm font-bold ${
              type === "ROOM" ? "bg-navy text-white" : "border border-border/15 bg-surface-raised text-fg"
            }`}
          >
            Chambre
          </button>
          <button
            type="button"
            onClick={() => setType("APARTMENT")}
            aria-pressed={type === "APARTMENT"}
            className={`h-11 flex-1 rounded-xl text-sm font-bold ${
              type === "APARTMENT" ? "bg-navy text-white" : "border border-border/15 bg-surface-raised text-fg"
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

      <div>
        <label htmlFor="photo" className="mb-1.5 block text-xs font-bold text-fg">
          Photo<span className="ml-1 font-medium text-fg/40">(optionnel)</span>
        </label>

        {previewToShow ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewToShow}
            alt="Aperçu de la photo"
            className="mb-2 h-32 w-full rounded-xl border border-border/15 object-cover"
          />
        ) : null}

        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-fg file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-surface-sunken file:px-4 file:text-sm file:font-bold file:text-fg"
        />
        <p className="mt-1 text-xs text-fg/50">JPEG, PNG ou WebP, 5 Mo maximum.</p>

        {currentPhoto && !newPhotoPreview ? (
          <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <input
              type="checkbox"
              name="removePhoto"
              checked={removePhoto}
              onChange={(e) => setRemovePhoto(e.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            Retirer la photo actuelle
          </label>
        ) : null}

        {errors?.photo?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      {showActiveToggle ? (
        <label className="flex items-center gap-2.5 text-sm font-bold text-fg">
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
