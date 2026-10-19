"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import { createUser } from "@/app/actions/users";
import { EstablishmentPermissionsSelector } from "../establishment-permissions-selector";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "GESTIONNAIRE", label: "Gestionnaire" },
  { value: "ADMIN", label: "Administrateur" },
];

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);
  const [role, setRole] = useState("GESTIONNAIRE");
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="name" label="Nom" type="text" required errors={errors?.name} />
      <Field id="username" label="Identifiant" type="text" required errors={errors?.username} />
      <Field
        id="password"
        label="Mot de passe"
        type="password"
        required
        autoComplete="new-password"
        hint="8 caractères minimum."
        errors={errors?.password}
      />
      <div>
        <label htmlFor="role" className="mb-1.5 block text-xs font-bold text-fg">
          Rôle
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
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

      <EstablishmentPermissionsSelector role={role} />

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
        {pending ? "Enregistrement..." : "CRÉER L'UTILISATEUR"}
      </button>
    </form>
  );
}
