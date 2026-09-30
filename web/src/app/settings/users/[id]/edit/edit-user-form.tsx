"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import { updateUser } from "@/app/actions/users";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "GESTIONNAIRE", label: "Gestionnaire" },
  { value: "ADMIN", label: "Administrateur" },
];

export function EditUserForm({
  userId,
  defaultName,
  defaultRole,
}: {
  userId: string;
  defaultName: string;
  defaultRole: string;
}) {
  const action = updateUser.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [role, setRole] = useState(defaultRole);
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="name" label="Nom" type="text" required defaultValue={defaultName} errors={errors?.name} />
      <div>
        <label htmlFor="role" className="mb-1.5 block text-xs font-bold text-navy">
          Rôle
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors?.role?.map((error) => (
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
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "ENREGISTRER LES MODIFICATIONS"}
      </button>
    </form>
  );
}
