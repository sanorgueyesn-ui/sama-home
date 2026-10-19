"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { requestPasswordReset, confirmPasswordReset, type ForgotPasswordState } from "@/app/actions/forgot-password";
import { AuthField } from "@/components/auth/auth-field";

const initialState: ForgotPasswordState = {
  step: "REQUEST",
};

export function ForgotPasswordForm() {
  const [requestState, requestAction, isRequesting] = useActionState(requestPasswordReset, initialState);
  const [confirmState, confirmAction, isConfirming] = useActionState(confirmPasswordReset, initialState);

  // Étape actuelle dérivée des états d'action
  const [activeStep, setActiveStep] = useState<"REQUEST" | "CODE" | "SUCCESS">("REQUEST");
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);

  // Synchronisation avec les retours serveur
  useEffect(() => {
    if (confirmState?.step === "SUCCESS") {
      setActiveStep("SUCCESS");
    } else if (confirmState?.step === "REQUEST") {
      setActiveStep("REQUEST");
    }
  }, [confirmState]);

  useEffect(() => {
    if (requestState?.step === "CODE" && requestState.email) {
      setActiveStep("CODE");
      setCurrentEmail(requestState.email);
      setMaskedEmail(requestState.maskedEmail || requestState.email);
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
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4 animate-in zoom-in-75 duration-300">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-xl font-black text-fg">Mot de passe réinitialisé !</h2>
        <p className="mt-2 text-sm text-fg/70 leading-relaxed max-w-sm">
          Votre mot de passe a été mis à jour avec succès. Vos anciennes sessions ont été révoquées pour garantir la sécurité de votre compte.
        </p>

        <Link
          href="/login"
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-extrabold text-ink transition-all hover:brightness-110 active:scale-98 shadow-md"
        >
          <span>SE CONNECTER</span>
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
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-left">
          <div className="flex items-center gap-2 text-brand-orange text-xs font-black uppercase tracking-wider">
            <span>✉️</span> Code de sécurité envoyé
          </div>
          <p className="mt-1 text-xs text-fg/80 leading-relaxed">
            Consultez votre boîte de réception à l'adresse <strong className="text-fg">{maskedEmail}</strong>. Saisissez le code à 6 chiffres reçu pour définir votre nouveau mot de passe.
          </p>
        </div>

        <form action={confirmAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={currentEmail} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-fg/70">
              Code de sécurité à 6 chiffres <span className="text-danger">*</span>
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
              {confirmState.error}
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
                Validation en cours...
              </span>
            ) : (
              "CHANGER MON MOT DE PASSE"
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
                ? "Envoi en cours..."
                : "Renvoyer un code de sécurité"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setActiveStep("REQUEST")}
            className="text-[11px] font-medium text-fg/50 hover:text-fg hover:underline"
          >
            ← Modifier l'adresse e-mail
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ÉTAPE 1 : DEMANDE D'ENVOI DU CODE
  // =========================================================================
  return (
    <form action={requestAction} className="flex flex-col gap-4">
      <div className="text-left">
        <p className="text-xs text-fg/70 leading-relaxed">
          Saisissez l'adresse e-mail ou l'identifiant associé à votre compte. Nous vous enverrons immédiatement un code de confirmation sécurisé par e-mail.
        </p>
      </div>

      <AuthField
        id="identifier"
        name="identifier"
        label="Adresse e-mail ou identifiant"
        icon="person"
        autoComplete="username"
        required
        autoFocus
        hint="Ex: nom@exemple.com ou mon_identifiant"
      />

      {requestState?.error && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-xs font-bold text-danger animate-in fade-in">
          {requestState.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isRequesting}
        className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-extrabold text-ink transition-all hover:brightness-110 active:scale-98 disabled:opacity-60 shadow-md"
      >
        {isRequesting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            Envoi du code...
          </span>
        ) : (
          <>
            <span>ENVOYER LE CODE</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-fg/60 hover:text-fg hover:underline transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Retour à la page de connexion
        </Link>
      </div>
    </form>
  );
}
