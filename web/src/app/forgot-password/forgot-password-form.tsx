"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { requestPasswordReset, confirmPasswordReset, type ForgotPasswordState } from "@/app/actions/forgot-password";
import { AuthField } from "@/components/auth/auth-field";
import { T, useT } from "@/components/i18n/i18n-provider";

const initialState: ForgotPasswordState = {
  step: "REQUEST",
};

export function ForgotPasswordForm() {
  const t = useT();
  const [requestState, requestAction, isRequesting] = useActionState(requestPasswordReset, initialState);
  const [confirmState, confirmAction, isConfirming] = useActionState(confirmPasswordReset, initialState);

  // Étape actuelle
  const [activeStep, setActiveStep] = useState<"REQUEST" | "CODE" | "SUCCESS">("REQUEST");
  const [identifierInput, setIdentifierInput] = useState<string>("");
  // Valeur SAISIE par l'utilisateur (jamais une adresse issue du compte en base).
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);

  // Synchronisation avec les retours serveur pour confirmation
  useEffect(() => {
    if (confirmState?.step === "SUCCESS") {
      setActiveStep("SUCCESS");
    } else if (confirmState?.step === "REQUEST") {
      setActiveStep("REQUEST");
    }
  }, [confirmState]);

  // Synchronisation avec les retours serveur pour demande
  useEffect(() => {
    if (requestState?.step === "CODE" && requestState.email) {
      setActiveStep("CODE");
      setCurrentEmail(requestState.email);
      setCountdown(60); // 60s cooldown pour renvoi
    }
  }, [requestState]);

  // Compte à rebours pour le renvoi de code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // =========================================================================
  // ÉTAPE 3 : SUCCÈS
  // =========================================================================
  if (activeStep === "SUCCESS") {
    return (
      <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-xl font-black text-fg"><T>Mot de passe réinitialisé !</T></h2>
        <p className="mt-2 text-sm text-fg/70 leading-relaxed max-w-sm">
          <T>Votre mot de passe a été mis à jour avec succès. Vos anciennes sessions ont été révoquées pour garantir la sécurité de votre compte.</T>
        </p>

        <Link
          href="/login"
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-extrabold text-ink transition-all hover:brightness-110 active:scale-98 shadow-md"
        >
          <span><T>SE CONNECTER</T></span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    );
  }

  // =========================================================================
  // ÉTAPE 2 : CODE DE VÉRIFICATION & NOUVEAU MOT DE PASSE
  // =========================================================================
  if (activeStep === "CODE") {
    // Message générique du serveur (identique pour tout identifiant) ; texte neutre si l'utilisateur
    // arrive ici avec « J'ai déjà reçu mon code », sans demande préalable.
    const bannerText =
      requestState?.message ??
      "Saisissez le code de sécurité à 6 chiffres reçu par e-mail pour définir votre nouveau mot de passe.";

    return (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
            <span>✉️</span> <T>Vérifiez votre boîte e-mail</T>
          </div>
          <p className="mt-1 text-xs text-fg/80 leading-relaxed">{bannerText}</p>
          {currentEmail && (
            <p className="mt-2 text-xs text-fg/80">
              <T>Saisie :</T> <strong className="break-all text-fg">{currentEmail}</strong>
            </p>
          )}
        </div>

        <p className="text-left text-[11px] leading-relaxed text-fg/60">
          <strong className="text-fg/80"><T>Pas de message ?</T></strong> <T>Vérifiez l&apos;orthographe de l&apos;adresse saisie
          ci-dessus et vos courriers indésirables. L&apos;envoi peut prendre quelques minutes. Si l&apos;adresse est
          incorrecte, utilisez « Modifier l&apos;adresse ». Si votre compte n&apos;a pas d&apos;adresse e-mail
          enregistrée, contactez l&apos;administrateur de votre établissement.</T>
        </p>

        <form action={confirmAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-fg/70">
              <T>Adresse e-mail ou identifiant</T> <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="text"
              required
              value={currentEmail}
              onChange={(e) => setCurrentEmail(e.target.value)}
              placeholder={t("nom@exemple.com ou identifiant")}
              className="h-12 w-full rounded-2xl border border-border/20 bg-surface-sunken px-4 text-sm font-semibold text-fg placeholder:text-fg/30 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-fg/70">
              <T>Code de sécurité à 6 chiffres</T> <span className="text-danger">*</span>
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              placeholder="123456"
              className="h-14 w-full rounded-2xl border border-border/20 bg-surface-sunken px-4 text-center font-mono text-2xl font-black tracking-widest text-fg placeholder:text-fg/30 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          <AuthField
            id="newPassword"
            name="newPassword"
            label="Nouveau mot de passe"
            icon="lock"
            passwordToggle
            autoComplete="new-password"
            hint="8 caractères minimum."
            required
          />

          <AuthField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            icon="lock"
            passwordToggle
            autoComplete="new-password"
            required
          />

          {confirmState?.error && (
            <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-xs font-bold text-danger animate-in fade-in">
              <T>{confirmState.error}</T>
            </p>
          )}

          <button
            type="submit"
            disabled={isConfirming}
            className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-extrabold text-ink transition-all hover:brightness-110 active:scale-98 disabled:opacity-60 shadow-md"
          >
            {isConfirming ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                <T>Validation en cours...</T>
              </span>
            ) : (
              <T>{"VALIDER MON NOUVEAU MOT DE PASSE"}</T>
            )}
          </button>
        </form>

        <div className="mt-2 flex flex-col items-center gap-2 border-t border-border/10 pt-3 text-xs">
          <form action={requestAction} className="w-full text-center">
            <input type="hidden" name="identifier" value={currentEmail} />
            <button
              type="submit"
              disabled={countdown > 0 || isRequesting}
              className="text-xs font-bold text-brand-orange hover:underline disabled:text-fg/40 disabled:no-underline"
            >
              {countdown > 0
                ? `Renvoyer un nouveau code (${countdown}s)`
                : isRequesting
                ? <T>{"Envoi en cours..."}</T>
                : <T>{"Renvoyer un code de sécurité"}</T>}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setActiveStep("REQUEST")}
            className="text-xs font-medium text-fg/50 hover:text-fg hover:underline transition-colors"
          >
            <T>← Modifier l&apos;adresse / Retour</T>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ÉTAPE 1 : DEMANDE D'ENVOI DU CODE
  // =========================================================================
  return (
    <form action={requestAction} className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="text-left">
        <p className="text-xs text-fg/70 leading-relaxed">
          <T>Saisissez l&apos;adresse e-mail ou l&apos;identifiant associé à votre compte. Si un compte correspond, un code de confirmation sécurisé vous sera envoyé par e-mail.</T>
        </p>
      </div>

      <div className="flex flex-col gap-1.5 text-left">
        <AuthField
          id="identifier"
          name="identifier"
          label="Adresse e-mail ou identifiant"
          icon="person"
          autoComplete="username"
          required
          autoFocus
          value={identifierInput}
          onChange={(e) => setIdentifierInput(e.target.value)}
          hint="Ex: nom@exemple.com ou mon_identifiant"
        />
      </div>

      {/* Étape 2c-2 : message d'erreur neutre (limitation, saisie invalide…) — aucun état « compte
          introuvable » ni « compte identifié » n'existe plus. */}
      {requestState?.error && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-amber-900 animate-in fade-in dark:text-amber-200"
        >
          <p className="text-xs font-semibold leading-relaxed"><T>{requestState.error}</T></p>
        </div>
      )}

      <button
        type="submit"
        disabled={isRequesting}
        className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-extrabold text-ink transition-all hover:brightness-110 active:scale-98 disabled:opacity-60 shadow-md"
      >
        {isRequesting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            <T>Envoi du code...</T>
          </span>
        ) : (
          <>
            <span><T>ENVOYER LE CODE</T></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>

      <div className="pt-2 text-center flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (identifierInput) {
              setCurrentEmail(identifierInput);
            }
            setActiveStep("CODE");
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 px-4 text-xs font-black text-brand-orange transition-all hover:bg-brand-orange/20 active:scale-98"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-1-1l-3 3m1 1l-2 2m-2-2l-4 4a5 5 0 1 1-7-7l4-4 7 7z" />
          </svg>
          <span><T>J&apos;AI DÉJÀ REÇU MON CODE DE CONFIRMATION →</T></span>
        </button>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-fg/60 hover:text-fg hover:underline transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <T>Retour à la page de connexion</T>
        </Link>

        {/* Lien statique, affiché pour tout le monde (ne dépend d'aucune réponse du serveur). */}
        <p className="text-xs font-medium text-fg/60">
          <T>Pas encore de compte ?</T>{" "}
          <Link href="/register" className="font-extrabold text-brand-orange underline hover:no-underline">
            <T>Créer un compte SAMA HOME →</T>
          </Link>
        </p>
      </div>
    </form>
  );
}
