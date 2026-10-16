"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerEstablishment } from "@/app/actions/establishment-registration";
import { AuthField } from "@/components/auth/auth-field";

/**
 * Phase 3G / Lot D12-P78 — même schéma que LoginForm (useActionState,
 * AuthField à icônes), mais avec acceptation explicite des conditions
 * d'utilisation côté client (jamais envoyée au serveur, ne correspond à
 * aucun champ du schéma Zod — seul un garde-fou local avant soumission).
 * Aucune session créée après succès : affiche un état de confirmation
 * explicite ("en attente d'approbation"), jamais une redirection vers une
 * zone protégée que l'établissement PENDING ne peut de toute façon pas
 * utiliser.
 */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerEstablishment, undefined);
  const [accepted, setAccepted] = useState(false);
  const errors = state?.errors;

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-base font-extrabold text-fg">Votre espace a été créé</p>
        <p className="text-sm font-medium text-fg/60">
          Votre établissement est en attente d&apos;approbation par un administrateur de la plateforme. Vous
          recevrez une notification dès qu&apos;il sera activé.
        </p>
        <Link
          href="/login"
          className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField
        id="establishmentName"
        label="Nom de l'établissement"
        icon="building"
        hint="Ex. Résidence Atlantique"
        required
        errors={errors?.establishmentName}
      />
      <AuthField
        id="managerName"
        label="Votre nom"
        icon="person"
        hint="Ex. Sanor Gueye"
        required
        errors={errors?.managerName}
      />
      <AuthField
        id="email"
        label="Adresse e-mail"
        icon="mail"
        type="email"
        hint="Ex. votre@email.com"
        autoComplete="email"
        required
        errors={errors?.email}
      />
      <AuthField
        id="password"
        label="Mot de passe"
        icon="lock"
        passwordToggle
        autoComplete="new-password"
        hint="8 caractères minimum."
        required
        errors={errors?.password}
      />

      <label className="flex items-start gap-2 text-xs font-medium text-fg/70">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-navy"
        />
        <span>
          J&apos;accepte les{" "}
          <span className="font-bold text-navy underline-offset-2">conditions d&apos;utilisation</span>
        </span>
      </label>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !accepted}
        className="mt-1 flex h-14 items-center justify-center gap-2 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Création..." : "CRÉER MON ESPACE"}
        {!pending && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
