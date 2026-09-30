"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { resetUserPassword } from "@/app/actions/users";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const action = resetUserPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "RÉINITIALISER LE MOT DE PASSE"}
      </button>
    </form>
  );
}
