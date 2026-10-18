"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  registerEstablishment,
  verifyOtpAndRegister,
  resendOtpCode,
} from "@/app/actions/establishment-registration";
import { AuthField } from "@/components/auth/auth-field";
import type { VerifyOtpFormState } from "@/lib/definitions";

export function RegisterForm() {
  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerEstablishment,
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"FREE_TRIAL" | "PAID_9900">("FREE_TRIAL");

  // État OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpState, setOtpState] = useState<VerifyOtpFormState>(undefined);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [localTestCode, setLocalTestCode] = useState<string | null>(null);

  const errors = registerState?.errors;
  const isOtpStep = registerState?.requiresOtp && !otpState?.success;
  const targetEmail = registerState?.email || "";
  const currentTestCode = localTestCode || registerState?.testCode;

  // -------------------------------------------------------------
  // Étape 3 : Confirmation finale après validation du code OTP
  // -------------------------------------------------------------
  if (otpState?.success) {
    const isPaid = otpState.plan === "PAID_9900";

    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-fg">Inscription validée avec succès !</h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            Votre adresse e-mail a été vérifiée et votre espace est prêt.
          </p>
        </div>

        {isPaid ? (
          /* Offre Payante 9 900 FCFA */
          <div className="w-full rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                Forfait Choisi
              </span>
              <span className="text-xs font-extrabold text-fg">9 900 FCFA / 3 mois</span>
            </div>

            <p className="mt-2 text-xs font-bold text-fg">Instructions de règlement pour l&apos;activation :</p>
            <div className="mt-2 space-y-1 rounded-xl bg-surface p-3 text-[12px] text-fg/80">
              <p>
                <strong>Wave / Orange Money :</strong> Envoyez votre règlement au numéro SAMA HOME.
              </p>
              <p>
                <strong>Référence de dossier :</strong>{" "}
                <span className="font-mono font-bold text-brand-orange">{otpState.reference ?? "SH-PAID"}</span>
              </p>
            </div>
            <p className="mt-2 text-[11px] text-fg/60">
              Dès confirmation de votre règlement, votre espace sera immédiatement débloqué pour 3 mois complets.
            </p>
          </div>
        ) : (
          /* Offre Découverte 2 Mois Gratuits */
          <div className="w-full rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                Offre Gratuite
              </span>
              <span className="text-xs font-extrabold text-fg">Période Découverte</span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-brand-orange">2 MOIS OFFERTS</span>
              <span className="text-xs font-bold text-fg/60">(0 FCFA)</span>
            </div>
            <p className="mt-1 text-[12px] text-fg/75">
              Vous bénéficiez de toutes les fonctionnalités de gestion sans frais pendant 2 mois complets.
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-fg/80">
              <span className="mt-0.5">⏳</span>
              <div>
                <strong>Validation en cours :</strong> L&apos;administrateur de SAMA HOME confirme votre accès sous peu.
              </div>
            </div>
          </div>
        )}

        <Link
          href="/login"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Étape 2 : Saisie du code OTP envoyé par e-mail
  // -------------------------------------------------------------
  if (isOtpStep) {
    const handleVerifyOtp = (e: React.FormEvent) => {
      e.preventDefault();
      startVerifyTransition(async () => {
        const formData = new FormData();
        formData.append("email", targetEmail);
        formData.append("code", otpCode.trim());
        const result = await verifyOtpAndRegister(undefined, formData);
        setOtpState(result);
      });
    };

    const handleResend = async () => {
      setResendStatus("Envoi en cours...");
      const res = await resendOtpCode(targetEmail);
      if (res.success) {
        setResendStatus("Nouveau code envoyé avec succès !");
        if (res.testCode) setLocalTestCode(res.testCode);
      } else {
        setResendStatus(res.message || "Erreur lors du renvoi.");
      }
    };

    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 py-1 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/10 text-navy dark:bg-white/10 dark:text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-fg">Vérifiez votre boîte e-mail</h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            Nous avons envoyé un code de vérification à 6 chiffres à{" "}
            <strong className="text-fg">{targetEmail}</strong>.
          </p>
        </div>

        {/* Aide au test local */}
        {currentTestCode && (
          <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 p-3 text-left">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              🧪 Code de test (développement local) :
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-300">
              {currentTestCode}
            </p>
            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
              (Visible également dans les logs du terminal serveur)
            </p>
          </div>
        )}

        <div>
          <label htmlFor="otp-input" className="block text-left text-xs font-bold text-fg/80">
            Code à 6 chiffres
          </label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Ex. 123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            required
            className="mt-1.5 h-12 w-full rounded-xl border border-border/20 bg-surface px-4 text-center font-mono text-2xl font-black tracking-widest text-fg outline-none focus:border-navy focus:ring-1 focus:ring-navy"
          />
        </div>

        {otpState?.errors?.code && (
          <p className="text-left text-xs font-medium text-danger">{otpState.errors.code[0]}</p>
        )}
        {otpState?.message && (
          <p className="rounded-lg bg-danger-bg p-2.5 text-xs font-medium text-danger">{otpState.message}</p>
        )}

        <button
          type="submit"
          disabled={otpCode.length !== 6 || isVerifying}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isVerifying ? "Vérification en cours..." : "Valider mon code et continuer"}
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-bold text-navy hover:underline"
          >
            Je n&apos;ai pas reçu le code (Renvoyer)
          </button>
          {resendStatus && <p className="text-[11px] font-medium text-fg/60">{resendStatus}</p>}
        </div>
      </form>
    );
  }

  // -------------------------------------------------------------
  // Étape 1 : Formulaire d'inscription + Choix de l'Offre
  // -------------------------------------------------------------
  return (
    <form action={registerAction} className="flex flex-col gap-4">
      {/* Sélecteur des 2 Offres */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-extrabold text-fg">Choisissez votre offre de démarrage :</label>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Offre 1 : Gratuite 2 Mois */}
          <button
            type="button"
            onClick={() => setSelectedPlan("FREE_TRIAL")}
            className={`flex flex-col rounded-2xl border p-3.5 text-left transition-all ${
              selectedPlan === "FREE_TRIAL"
                ? "border-navy bg-navy/5 shadow-sm ring-1 ring-navy dark:bg-white/5 dark:ring-white"
                : "border-border/15 bg-surface hover:border-border/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                Essai Gratuit
              </span>
              <input
                type="radio"
                name="plan_radio"
                checked={selectedPlan === "FREE_TRIAL"}
                onChange={() => setSelectedPlan("FREE_TRIAL")}
                className="accent-navy"
              />
            </div>
            <p className="mt-2 text-base font-black text-fg">2 MOIS OFFERTS</p>
            <p className="text-[11px] font-semibold text-fg/60">0 FCFA — Sans engagement</p>
            <p className="mt-1 text-[11px] leading-tight text-fg/70">
              Idéal pour découvrir toutes les fonctionnalités librement.
            </p>
          </button>

          {/* Offre 2 : Payante 9 900 FCFA / 3 Mois */}
          <button
            type="button"
            onClick={() => setSelectedPlan("PAID_9900")}
            className={`flex flex-col rounded-2xl border p-3.5 text-left transition-all ${
              selectedPlan === "PAID_9900"
                ? "border-brand-orange bg-brand-orange/5 shadow-sm ring-1 ring-brand-orange"
                : "border-border/15 bg-surface hover:border-border/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-brand-orange/15 px-2 py-0.5 text-[10px] font-black text-brand-orange uppercase">
                Prioritaire
              </span>
              <input
                type="radio"
                name="plan_radio"
                checked={selectedPlan === "PAID_9900"}
                onChange={() => setSelectedPlan("PAID_9900")}
                className="accent-brand-orange"
              />
            </div>
            <p className="mt-2 text-base font-black text-brand-orange">9 900 FCFA</p>
            <p className="text-[11px] font-semibold text-fg/60">Pour 3 mois de gestion</p>
            <p className="mt-1 text-[11px] leading-tight text-fg/70">
              Activation prioritaire et assistance dédiée pour votre hôtel.
            </p>
          </button>
        </div>
      </div>

      {/* Champ caché pour le plan */}
      <input type="hidden" name="plan" value={selectedPlan} />

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
        label="Adresse e-mail (reçoit le code OTP)"
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

      {registerState?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {registerState.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!accepted || isRegisterPending}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isRegisterPending
          ? "Envoi du code en cours..."
          : "Continuer et recevoir mon code de validation"}
      </button>
    </form>
  );
}
