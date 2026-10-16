"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import { updateSettings } from "@/app/actions/settings";

export function SettingsForm({
  defaultValues,
}: {
  defaultValues?: {
    establishmentName: string;
    phone: string;
    secondaryPhone: string | null;
    address: string;
    email: string | null;
    description: string | null;
    /** URL d'affichage déjà résolue par la page (présignée ou héritée) — jamais la clé brute du bucket. */
    logoUrl: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const errors = state?.errors;

  useEffect(() => {
    // Lot "Téléversement durable des images" — l'URL créée par
    // URL.createObjectURL() n'est révoquée qu'ici (changement de fichier ou
    // démontage), jamais laissée à fuir en mémoire navigateur.
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
      setNewLogoPreview(url);
      setRemoveLogo(false);
    } else {
      setNewLogoPreview(null);
    }
  }

  const currentLogo = defaultValues?.logoUrl ?? null;
  const previewToShow = newLogoPreview ?? (removeLogo ? null : currentLogo);

  return (
    <form action={formAction} className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-2xl">
      <Field
        id="establishmentName"
        label="Nom de l'établissement"
        type="text"
        required
        defaultValue={defaultValues?.establishmentName}
        errors={errors?.establishmentName}
      />
      <Field
        id="phone"
        label="Téléphone"
        type="tel"
        required
        defaultValue={defaultValues?.phone}
        errors={errors?.phone}
      />
      <Field
        id="secondaryPhone"
        label="Téléphone secondaire"
        type="tel"
        defaultValue={defaultValues?.secondaryPhone ?? undefined}
        errors={errors?.secondaryPhone}
      />
      <Field
        id="address"
        label="Adresse"
        type="text"
        required
        defaultValue={defaultValues?.address}
        errors={errors?.address}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        defaultValue={defaultValues?.email ?? undefined}
        errors={errors?.email}
      />
      <TextAreaField
        id="description"
        label="Description"
        defaultValue={defaultValues?.description ?? undefined}
        errors={errors?.description}
      />

      <div>
        <label htmlFor="logo" className="mb-1.5 block text-xs font-bold text-fg">
          Logo de l&apos;établissement<span className="ml-1 font-medium text-fg/40">(optionnel)</span>
        </label>

        {previewToShow ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewToShow}
            alt="Aperçu du logo"
            className="mb-2 h-20 w-20 rounded-xl border border-border/15 bg-surface-sunken object-contain p-2"
          />
        ) : null}

        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-fg file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-surface-sunken file:px-4 file:text-sm file:font-bold file:text-fg"
        />
        <p className="mt-1 text-xs text-fg/50">
          JPEG, PNG ou WebP, 5 Mo maximum. Réutilisé sur le contrat de location PDF.
        </p>

        {currentLogo && !newLogoPreview ? (
          <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <input
              type="checkbox"
              name="removeLogo"
              checked={removeLogo}
              onChange={(e) => setRemoveLogo(e.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            Retirer le logo actuel
          </label>
        ) : null}

        {errors?.logoUrl?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-14 rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "ENREGISTRER"}
      </button>
    </form>
  );
}
