"use client";

import { useActionState, useState } from "react";
import { login, setPasswordWithGoogleToken } from "@/app/actions/auth";
import { AuthField } from "@/components/auth/auth-field";

export function LoginForm({
  defaultUsername = "",
  isGoogleVerified = false,
  googleToken = "",
}: {
  defaultUsername?: string;
  isGoogleVerified?: boolean;
  googleToken?: string;
}) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPasswordState, setPasswordAction, isSettingPassword] = useActionState(
    setPasswordWithGoogleToken,
    undefined,
  );

  if (showSetPassword && isGoogleVerified && googleToken) {
    return (
      <form action={setPasswordAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={googleToken} />

        <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-3.5 text-left text-xs text-fg/80">
          <p className="font-extrabold text-fg">Définition de votre mot de passe</p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg/70">
            Votre compte Google (<strong className="text-fg">{defaultUsername}</strong>) est vérifié. Choisissez un mot de passe sécurisé pour vous connecter.
          </p>
        </div>

        <AuthField
          id="password"
          label="Nouveau mot de passe"
          icon="lock"
          passwordToggle
          autoComplete="new-password"
          hint="8 caractères minimum."
          required
          autoFocus
        />

        <AuthField
          id="confirmPassword"
          label="Confirmer le mot de passe"
          icon="lock"
          passwordToggle
          autoComplete="new-password"
          required
        />

        {setPasswordState?.error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
            {setPasswordState.error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            disabled={isSettingPassword}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSettingPassword ? "Enregistrement..." : "Enregistrer et me connecter"}
          </button>

          <button
            type="button"
            onClick={() => setShowSetPassword(false)}
            className="py-1 text-center text-xs font-bold text-fg/60 hover:text-fg hover:underline"
          >
            ← Retour à la saisie du mot de passe
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField
        id="username"
        label="Identifiant ou e-mail"
        icon="person"
        autoComplete="username"
        defaultValue={defaultUsername}
        required
      />
      <AuthField
        id="password"
        label="Mot de passe"
        icon="lock"
        passwordToggle
        autoComplete="current-password"
        autoFocus={!!defaultUsername}
        required
      />

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-navy" />
          Se souvenir de moi
        </label>

        {isGoogleVerified && googleToken ? (
          <button
            type="button"
            onClick={() => setShowSetPassword(true)}
            className="text-left text-xs font-bold text-navy hover:underline"
          >
            Première connexion ou mot de passe non défini ? Définir mon mot de passe
          </button>
        ) : (
          <p className="text-xs font-medium text-fg/50">
            Mot de passe oublié ? Contactez un administrateur.
          </p>
        )}
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

