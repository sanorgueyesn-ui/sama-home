"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { AuthField } from "@/components/auth/auth-field";

/**
 * Logique de connexion INCHANGÉE — même useActionState(login, ...), mêmes
 * noms de champs (username/password/remember), même message d'erreur, même
 * état de chargement. Seule la présentation (AuthField à icônes) diffère de
 * l'ancienne version.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField id="username" label="Identifiant" icon="person" autoComplete="username" required />
      <AuthField
        id="password"
        label="Mot de passe"
        icon="lock"
        passwordToggle
        autoComplete="current-password"
        required
      />

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-navy" />
          Se souvenir de moi
        </label>
        <p className="text-xs font-medium text-fg/50">
          Mot de passe oublié ? Contactez un administrateur.
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-14 items-center justify-center gap-2 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white transition-opacity focus-visible:ring-2 focus-visible:ring-navy disabled:opacity-60"
      >
        {pending ? "Connexion..." : "SE CONNECTER"}
        {!pending && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
