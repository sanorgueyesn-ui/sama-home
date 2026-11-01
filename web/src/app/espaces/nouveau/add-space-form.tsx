"use client";

import { useActionState } from "react";
import { createSpace } from "@/app/actions/space";

const MODE_OPTIONS = [
  { value: "RESIDENCE", label: "Résidence meublée", hint: "Logements meublés, locations courtes ou longues" },
  { value: "HOTEL", label: "Hôtel", hint: "Chambres, séjours, réception" },
  { value: "REAL_ESTATE", label: "Agence immobilière", hint: "Biens, mandats, locations pour des propriétaires" },
] as const;

export function AddSpaceForm() {
  const [state, formAction, pending] = useActionState(createSpace, undefined);

  if (state?.pendingName) {
    return (
      <div role="status" className="rounded-2xl border border-fg/15 bg-surface-raised p-5 text-sm">
        <p className="font-bold">Demande envoyée</p>
        <p className="mt-1 text-fg/70">
          L&apos;espace « {state.pendingName} » sera utilisable dès son approbation par l&apos;équipe SAMA HOME. Vous le
          verrez alors dans le sélecteur d&apos;espace. Vos autres espaces ne sont pas modifiés.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="space-name" className="text-sm font-bold">
          Nom de l&apos;espace
        </label>
        <input
          id="space-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="off"
          aria-describedby={state?.errors?.name ? "space-name-error" : undefined}
          className="rounded-xl border border-fg/15 bg-transparent px-4 py-3 text-sm"
        />
        {state?.errors?.name ? (
          <p id="space-name-error" role="alert" className="text-xs text-red-400">
            {state.errors.name[0]}
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold">Type d&apos;activité</legend>
        {MODE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-fg/15 px-4 py-3 text-sm has-[:checked]:border-fg/50"
          >
            <input type="radio" name="businessMode" value={option.value} required className="mt-1" />
            <span className="flex flex-col">
              <span className="font-bold">{option.label}</span>
              <span className="text-xs text-fg/70">{option.hint}</span>
            </span>
          </label>
        ))}
        {state?.errors?.businessMode ? (
          <p role="alert" className="text-xs text-red-400">
            {state.errors.businessMode[0]}
          </p>
        ) : null}
      </fieldset>

      {state?.message ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-fg px-5 py-3 text-sm font-bold text-surface transition-opacity disabled:opacity-60"
      >
        {pending ? "Création..." : "Créer l'espace"}
      </button>
    </form>
  );
}
