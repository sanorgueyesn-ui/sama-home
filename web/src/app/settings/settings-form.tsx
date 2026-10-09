"use client";

import { useActionState } from "react";
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
  };
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);
  const errors = state?.errors;

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
