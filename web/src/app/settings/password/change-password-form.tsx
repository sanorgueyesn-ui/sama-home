"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { changePassword } from "@/app/actions/settings";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        id="currentPassword"
        label="Mot de passe actuel"
        type="password"
        required
        autoComplete="current-password"
        errors={errors?.currentPassword}
      />
      <Field
        id="newPassword"
        label="Nouveau mot de passe"
        type="password"
        required
        autoComplete="new-password"
        hint="8 caractères minimum."
        errors={errors?.newPassword}
      />
      <Field
        id="confirmPassword"
        label="Confirmer le nouveau mot de passe"
        type="password"
        required
        autoComplete="new-password"
        errors={errors?.confirmPassword}
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
        {pending ? "Enregistrement..." : "CONFIRMER"}
      </button>
    </form>
  );
}
