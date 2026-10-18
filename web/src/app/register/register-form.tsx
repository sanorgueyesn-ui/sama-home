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
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-fg">Inscription enregistrée avec succès !</h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            Bienvenue dans l&apos;aventure SAMA HOME.
          </p>
        </div>

        {/* Bannière offre de lancement */}
        <div className="w-full rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
              Offre Spéciale
            </span>
            <span className="text-xs font-extrabold text-fg">Période de Découverte</span>
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-brand-orange">2 MOIS OFFERTS</span>
            <span className="text-xs font-bold text-fg/60">(100% Gratuit)</span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-fg/75">
            Profitez de l&apos;ensemble des fonctionnalités de gestion hôtelière en toute liberté dès la validation de votre espace.
          </p>

          <div className="mt-3 border-t border-brand-orange/15 pt-2.5">
            <p className="text-[11px] font-medium text-fg/60">
              Tarif après l&apos;essai gratuit :{" "}
              <strong className="font-bold text-fg">9 900 FCFA pour 3 mois</strong> de tranquillité complète.
            </p>
          </div>
        </div>

        {/* Statut d'attente */}
        <div className="flex w-full items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 text-left">
          <span className="mt-0.5 text-base">⏳</span>
          <div className="text-[12px] leading-snug text-fg/80">
            <strong className="font-bold text-fg">Validation en cours :</strong> Votre demande a été transmise à
            l&apos;administrateur de SAMA HOME pour confirmation. Vous recevrez l&apos;accès dès validation de votre compte.
          </div>
        </div>

        <Link
          href="/login"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          Retour à la page de connexion
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
