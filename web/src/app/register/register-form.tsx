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
import { AGENCY_MODE_ENABLED } from "@/lib/business-mode";
import type { PricingSettingsView } from "@/lib/platform-settings-data";
import { DEFAULT_TRIAL_DURATION_MONTHS, DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/pricing-defaults";
import { T, useT } from "@/components/i18n/i18n-provider";

export function RegisterForm({
  pricing,
  isGoogle = false,
  initialEmail = "",
  initialName = "",
  googleToken = "",
  initialMode = "RESIDENCE",
  chosenPlan = null,
}: {
  pricing?: PricingSettingsView;
  isGoogle?: boolean;
  initialEmail?: string;
  initialName?: string;
  googleToken?: string;
  initialMode?: string;
  chosenPlan?: { name: string; amountFcfa: number; periodMonths: number; tier: string; cycle: string } | null;
}) {
  const t = useT();
  const trialMonths = DEFAULT_TRIAL_DURATION_MONTHS; // règle confirmée : 1 mois d'essai gratuit
  const periodMonths = pricing?.periodMonths ?? DEFAULT_PERIOD_MONTHS;
  const periodPrice = pricing?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA;
  const formattedPrice = periodPrice.toLocaleString("fr-FR");

  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerEstablishment,
    undefined,
  );
  const [accepted, setAccepted] = useState(false);
  const selectedPlan = "FREE_TRIAL" as const; // l'ancienne offre à 9 900 FCFA n'est plus proposée
  const [selectedMode, setSelectedMode] = useState<"RESIDENCE" | "HOTEL" | "AGENCY">(() => {
    const m = (initialMode || "").toUpperCase();
    if (m === "HOTEL") return "HOTEL";
    // Agence immobilière suspendue : un lien `?mode=AGENCY` retombe sur la Résidence.
    if (AGENCY_MODE_ENABLED && (m === "AGENCY" || m === "IMMOBILIER")) return "AGENCY";
    return "RESIDENCE";
  });

  // État OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpState, setOtpState] = useState<VerifyOtpFormState>(undefined);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [localTestCode, setLocalTestCode] = useState<string | null>(null);

  // « Modifier l'adresse » : on mémorise la réponse du serveur qui a été écartée pour revenir au
  // formulaire ; une nouvelle soumission produit une nouvelle réponse et rouvre l'étape du code.
  const [dismissedState, setDismissedState] = useState<typeof registerState>(undefined);

  const errors = registerState?.errors;
  const isOtpStep = registerState?.requiresOtp && !otpState?.success && registerState !== dismissedState;
  const targetEmail = registerState?.email || initialEmail || "";
  const currentTestCode = localTestCode || registerState?.testCode;

  // -------------------------------------------------------------
  // Étape 3bis : Inscription Google validée directement
  // -------------------------------------------------------------
  if (registerState?.googleRegistered) {
    const isPaid = registerState.plan === "PAID_9900";

    if (registerState.pendingApproval) {
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-fg"><T>Inscription enregistrée !</T></h3>
            <p className="mt-1 text-xs font-medium text-fg/60">
              <T>Votre établissement</T> <strong className="text-fg">« {registerState.establishmentName} »</strong> <T>a été enregistré.</T>
            </p>
          </div>

          <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-amber-500/20 px-2 text-[11px] font-black tracking-wide text-amber-400 uppercase">
                <T>Modération SAMA HOME</T>
              </span>
            </div>

            <p className="mt-2 text-[12px] font-medium text-fg/80 leading-relaxed">
              <T>Pour des raisons de sécurité, chaque inscription fait l&apos;objet d&apos;une vérification par notre administrateur avant l&apos;activation des accès.</T>
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
              <span className="mt-0.5">🛡️</span>
              <div>
                <strong><T>Validation requise :</T></strong> <T>Votre compte sera activé dès la confirmation administrative avec vos</T> {trialMonths} <T>mois d&apos;essai gratuit.</T>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          >
            <T>Retour à la page de connexion</T>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-fg"><T>Établissement créé avec succès !</T></h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            <T>Votre établissement</T> <strong className="text-fg">« {registerState.establishmentName} »</strong> <T>a été configuré avec succès.</T>
          </p>
        </div>

        {isPaid ? (
          <div className="w-full rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                <T>Forfait Choisi</T>
              </span>
              <span className="text-xs font-extrabold text-fg">{formattedPrice} <T>FCFA /</T> {periodMonths} mois</span>
            </div>

            <p className="mt-2 text-xs font-bold text-fg"><T>Instructions de règlement :</T></p>
            <div className="mt-2 space-y-1 rounded-xl bg-surface p-3 text-[12px] text-fg/80">
              <p>
                <strong><T>Wave / Orange Money :</T></strong> <T>Envoyez votre règlement au</T> <strong className="text-brand-orange">+221 77 338 66 60</strong>.
              </p>
              <p>
                <strong><T>Référence de dossier :</T></strong>{" "}
                <span className="font-mono font-bold text-brand-orange">{registerState.reference ?? "SH-PAID"}</span>
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="mt-0.5">🚀</span>
              <div>
                <strong><T>Accès immédiat :</T></strong> Vos {trialMonths} <T>mois d&apos;essai gratuit sont activés dès maintenant !</T>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                <T>Offre Gratuite</T>
              </span>
              <span className="text-xs font-extrabold text-fg"><T>Période Découverte</T></span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-brand-orange">{trialMonths} <T>MOIS OFFERTS</T></span>
              <span className="text-xs font-bold text-fg/60"><T>(0 FCFA)</T></span>
            </div>
            <p className="mt-1 text-[12px] text-fg/75">
              <T>Vous bénéficiez de toutes les fonctionnalités de gestion sans frais pendant</T> {trialMonths} <T>mois complets.</T>
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="mt-0.5">🚀</span>
              <div>
                <strong><T>Accès immédiat :</T></strong> <T>Votre compte est activé avec</T> {trialMonths} <T>mois gratuits.</T>
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/login?google_verified=1&username=${encodeURIComponent(registerState.email || "")}&establishment=${encodeURIComponent(registerState.establishmentName || "")}`}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          <T>Se connecter avec mon mot de passe</T>
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Étape 3 : Confirmation finale après validation du code OTP
  // -------------------------------------------------------------
  if (otpState?.success) {
    const isPaid = otpState.plan === "PAID_9900";


    if (otpState?.pendingApproval) {
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-fg"><T>Inscription enregistrée !</T></h3>
            <p className="mt-1 text-xs font-medium text-fg/60">
              <T>Votre demande a été reçue et est en cours de validation.</T>
            </p>
          </div>

          <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-amber-500/20 px-2 text-[11px] font-black tracking-wide text-amber-400 uppercase">
                <T>Modération SAMA HOME</T>
              </span>
            </div>

            <p className="mt-2 text-[12px] font-medium text-fg/80 leading-relaxed">
              <T>Pour des raisons de sécurité et de conformité, chaque nouvel établissement fait l&apos;objet d&apos;une vérification par notre équipe administrative avant l&apos;activation des accès.</T>
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
              <span className="mt-0.5">🛡️</span>
              <div>
                <strong><T>Validation requise :</T></strong> <T>Vous aurez accès dès l&apos;approbation par l&apos;administrateur de SAMA HOME avec vos</T> {trialMonths} <T>mois d&apos;essai offerts.</T>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          >
            <T>Retour à la page de connexion</T>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-fg"><T>Inscription validée avec succès !</T></h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            <T>Votre adresse e-mail a été vérifiée et votre espace est prêt.</T>
          </p>
        </div>

        {isPaid ? (
          /* Offre Payante */
          <div className="w-full rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                <T>Forfait Choisi</T>
              </span>
              <span className="text-xs font-extrabold text-fg">{formattedPrice} <T>FCFA /</T> {periodMonths} mois</span>
            </div>

            <p className="mt-2 text-xs font-bold text-fg"><T>Instructions de règlement pour l&apos;activation :</T></p>
            <div className="mt-2 space-y-1 rounded-xl bg-surface p-3 text-[12px] text-fg/80">
              <p>
                <strong><T>Wave / Orange Money :</T></strong> <T>Envoyez votre règlement au</T> <strong className="text-brand-orange">+221 77 338 66 60</strong>.
              </p>
              <p>
                <strong><T>Référence de dossier :</T></strong>{" "}
                <span className="font-mono font-bold text-brand-orange">{otpState.reference ?? "SH-PAID"}</span>
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="mt-0.5">🚀</span>
              <div>
                <strong><T>Accès immédiat :</T></strong> Vos {trialMonths} <T>mois d&apos;essai gratuit sont activés dès maintenant. Vous pouvez vous connecter et explorer votre espace immédiatement !</T>
              </div>
            </div>
          </div>
        ) : (
          /* Offre Découverte Gratuite */
          <div className="w-full rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-brand-orange px-2 text-[11px] font-black tracking-wide text-white uppercase">
                <T>Offre Gratuite</T>
              </span>
              <span className="text-xs font-extrabold text-fg"><T>Période Découverte</T></span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-brand-orange">{trialMonths} <T>MOIS OFFERTS</T></span>
              <span className="text-xs font-bold text-fg/60"><T>(0 FCFA)</T></span>
            </div>
            <p className="mt-1 text-[12px] text-fg/75">
              <T>Vous bénéficiez de toutes les fonctionnalités de gestion sans frais pendant</T> {trialMonths} <T>mois complets.</T>
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="mt-0.5">🚀</span>
              <div>
                <strong><T>Accès immédiat :</T></strong> <T>Votre compte est activé avec</T> {trialMonths} <T>mois gratuits. Vous pouvez vous connecter dès maintenant sans attendre !</T>
              </div>
            </div>
          </div>
        )}

        <Link
          href="/login"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90"
        >
          <T>Aller à la connexion</T>
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
      // Message générique du serveur (identique que la demande soit en cours ou non) : jamais
      // d'affirmation « envoyé avec succès » qui confirmerait une inscription en cours.
      setResendStatus(res.message || "Veuillez patienter avant de demander un nouveau code.");
      if (res.success && res.testCode) setLocalTestCode(res.testCode);
    };

    const handleEditAddress = () => {
      setDismissedState(registerState);
      setOtpCode("");
      setOtpState(undefined);
      setResendStatus(null);
      setLocalTestCode(null);
    };

    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 py-1 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-fg/10 text-fg">
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
          <h3 className="text-lg font-extrabold text-fg"><T>Vérifiez votre boîte e-mail</T></h3>
          <p className="mt-1 text-xs font-medium text-fg/60">
            <T>Si l&apos;adresse saisie peut être utilisée pour une inscription, un message contenant les instructions
            nécessaires vient de vous être envoyé. Le message peut mettre quelques minutes à arriver. Pensez à
            vérifier vos courriers indésirables.</T>
          </p>
          <p className="mt-2 text-xs font-medium text-fg/60">
            <T>Adresse saisie :</T> <strong className="break-all text-fg">{targetEmail}</strong>
          </p>
        </div>

        <p className="text-left text-[11px] leading-relaxed text-fg/60">
          <strong className="text-fg/80"><T>Pas de message ?</T></strong> <T>Vérifiez l&apos;orthographe de l&apos;adresse saisie
          ci-dessus et vos courriers indésirables. L&apos;envoi peut prendre quelques minutes. Si l&apos;adresse est
          incorrecte, utilisez « Modifier l&apos;adresse ».</T>
        </p>

        {/* Aide au test local */}
        {currentTestCode && (
          <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 p-3 text-left">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <T>🧪 Code de test (développement local) :</T>
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tracking-widest text-emerald-700 dark:text-emerald-300">
              {currentTestCode}
            </p>
            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
              <T>(Visible également dans les logs du terminal serveur)</T>
            </p>
          </div>
        )}

        <div>
          <label htmlFor="otp-input" className="block text-left text-xs font-bold text-fg/80">
            <T>Code à 6 chiffres</T>
          </label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder={t("Ex. 123456")}
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
          <p className="rounded-lg bg-danger-bg p-2.5 text-xs font-medium text-danger"><T>{otpState.message}</T></p>
        )}

        <button
          type="submit"
          disabled={otpCode.length !== 6 || isVerifying}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isVerifying ? <T>{"Vérification en cours..."}</T> : <T>{"Valider mon code et continuer"}</T>}
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleResend}
            className="text-xs font-bold text-fg hover:underline"
          >
            <T>Je n&apos;ai pas reçu le code (Renvoyer)</T>
          </button>
          {resendStatus && <p className="text-[11px] font-medium text-fg/60">{resendStatus}</p>}
          <button
            type="button"
            onClick={handleEditAddress}
            className="mt-1 text-xs font-medium text-fg/50 transition-colors hover:text-fg hover:underline"
          >
            <T>← Modifier l&apos;adresse</T>
          </button>
        </div>
      </form>
    );
  }

  // -------------------------------------------------------------
  // Étape 1 : Formulaire d'inscription + Choix de l'Offre
  // -------------------------------------------------------------
  return (
    <form action={registerAction} className="flex flex-col gap-4">
      {/* 1. Sélecteur d'Activité Métier (Résidence, Hôtel, Agence - Étape 2 du Guide) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-fg"><T>Votre activité principale :</T></label>
          <Link href="/#activites" className="text-[11px] font-semibold text-brand-orange hover:underline">
            <T>Changer d&apos;activité</T>
          </Link>
        </div>

        <div className={`grid gap-2 ${AGENCY_MODE_ENABLED ? "grid-cols-3" : "grid-cols-2"}`}>
          {/* Mode 1: Résidence */}
          <button
            type="button"
            onClick={() => setSelectedMode("RESIDENCE")}
            className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
              selectedMode === "RESIDENCE"
                ? "border-navy bg-navy/10 text-fg shadow-sm ring-2 ring-navy dark:bg-white/10 dark:ring-white"
                : "border-border/20 bg-surface text-fg/60 hover:border-border/50 hover:text-fg"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-raised mb-1.5 shadow-2xs">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <span className="text-xs font-black leading-tight"><T>Résidence</T></span>
            <span className="text-[10px] text-fg/60"><T>Meublée</T></span>
          </button>

          {/* Mode 2: Hôtel */}
          <button
            type="button"
            onClick={() => setSelectedMode("HOTEL")}
            className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
              selectedMode === "HOTEL"
                ? "border-navy bg-navy/10 text-fg shadow-sm ring-2 ring-navy dark:bg-white/10 dark:ring-white"
                : "border-border/20 bg-surface text-fg/60 hover:border-border/50 hover:text-fg"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-raised mb-1.5 shadow-2xs">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 4v16" />
                <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                <path d="M2 17h20" />
              </svg>
            </span>
            <span className="text-xs font-black leading-tight"><T>Hôtel</T></span>
            <span className="text-[10px] text-fg/60"><T>Nuitée</T></span>
          </button>

          {/* Mode 3: Agence — suspendue (AGENCY_MODE_ENABLED) : le choix n'est pas proposé */}
          {AGENCY_MODE_ENABLED ? (
          <button
            type="button"
            onClick={() => setSelectedMode("AGENCY")}
            className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all ${
              selectedMode === "AGENCY"
                ? "border-navy bg-navy/10 text-fg shadow-sm ring-2 ring-navy dark:bg-white/10 dark:ring-white"
                : "border-border/20 bg-surface text-fg/60 hover:border-border/50 hover:text-fg"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-raised mb-1.5 shadow-2xs">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span className="text-xs font-black leading-tight"><T>Agence</T></span>
            <span className="text-[10px] text-fg/60"><T>Immobilière</T></span>
          </button>
          ) : null}
        </div>
      </div>

      {/* Essai gratuit + formule choisie (le paiement se fait en ligne depuis la page Abonnement, après connexion) */}
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-navy bg-navy/5 p-3.5 ring-1 ring-navy dark:bg-white/5 dark:ring-white">
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
            <T>Essai Gratuit</T>
          </span>
          <p className="mt-2 text-base font-black text-fg">{trialMonths} <T>MOIS OFFERTS</T></p>
          <p className="text-[11px] font-semibold text-fg/60"><T>0 FCFA — Sans engagement</T></p>
          <p className="mt-1 text-[11px] leading-tight text-fg/70">
            <T>Idéal pour découvrir toutes les fonctionnalités librement.</T>
          </p>
        </div>
        {chosenPlan ? (
          <div className="rounded-2xl border border-border/15 bg-surface p-3.5">
            <p className="text-[11px] font-bold uppercase text-fg/50"><T>Formule choisie</T></p>
            <p className="mt-1 text-base font-black text-fg">
              <T>{chosenPlan.name}</T> · {chosenPlan.amountFcfa.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA
              {" / "}
              {chosenPlan.periodMonths === 12 ? <T>an</T> : <T>mois</T>}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-fg/70">
              <T>Vous la réglerez en ligne depuis la page Abonnement, après votre essai gratuit.</T>
            </p>
          </div>
        ) : null}
      </div>

      {/* Google verified banner */}
      {isGoogle && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-3.5 text-left text-xs">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white font-bold text-xs">
            ✓
          </span>
          <div>
            <p className="font-extrabold text-fg"><T>Compte Google vérifié (</T>{initialEmail})</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg/70">
              <T>Votre identité a été validée. Choisissez le nom de votre établissement et définissez votre mot de passe pour finaliser votre inscription.</T>
            </p>
          </div>
        </div>
      )}

      {/* Champs cachés pour le plan et le mode */}
      <input type="hidden" name="plan" value={selectedPlan} />
      {chosenPlan ? <input type="hidden" name="preferredPlanTier" value={chosenPlan.tier} /> : null}
      {chosenPlan ? <input type="hidden" name="preferredBilling" value={chosenPlan.cycle} /> : null}
      <input type="hidden" name="activityMode" value={selectedMode} />
      {isGoogle && <input type="hidden" name="googleToken" value={googleToken} />}

      <AuthField
        id="establishmentName"
        label={
          selectedMode === "RESIDENCE"
            ? "Nom de la résidence"
            : selectedMode === "HOTEL"
              ? "Nom de l'hôtel"
              : "Nom de l'agence immobilière"
        }
        icon="building"
        hint={
          selectedMode === "RESIDENCE"
            ? "Ex. Résidence Atlantique"
            : selectedMode === "HOTEL"
              ? "Ex. Hôtel Le Saphir"
              : "Ex. Agence Immobilière Teranga"
        }
        required
        autoFocus
        errors={errors?.establishmentName}
      />
      <AuthField
        id="managerName"
        label="Votre nom"
        icon="person"
        hint="Ex. Sanor Gueye"
        defaultValue={initialName}
        required
        errors={errors?.managerName}
      />

      {isGoogle ? (
        <div>
          <label htmlFor="email" className="block text-left text-xs font-bold text-fg/80">
            <T>Adresse e-mail</T> <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><T>✓ Vérifiée via Google</T></span>
          </label>
          <input type="hidden" name="email" value={initialEmail} />
          <div className="relative mt-1.5 flex h-12 w-full items-center rounded-xl border border-border/15 bg-surface/60 pl-10 pr-4 text-sm font-semibold text-fg/80">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg/40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3.5 6 8.5 7 8.5-7" />
              </svg>
            </span>
            {initialEmail}
          </div>
          {errors?.email && (
            <p className="mt-1 pl-1 text-xs font-medium text-danger">{errors.email[0]}</p>
          )}
        </div>
      ) : (
        <AuthField
          id="email"
          label="Adresse e-mail (reçoit le code OTP)"
          icon="mail"
          type="email"
          hint="Ex. votre@email.com"
          autoComplete="email"
          defaultValue={targetEmail}
          required
          errors={errors?.email}
        />
      )}

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
          <T>J&apos;accepte les</T>{" "}
          <span className="font-bold text-fg underline-offset-2"><T>conditions d&apos;utilisation</T></span>
        </span>
      </label>

      {registerState?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          <T>{registerState.message}</T>
        </p>
      )}

      <button
        type="submit"
        disabled={!accepted || isRegisterPending}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isRegisterPending
          ? <T>{"Création de votre établissement..."}</T>
          : isGoogle
            ? <T>{"CRÉER MON ÉTABLISSEMENT"}</T>
            : <T>{"Continuer et recevoir mon code de validation"}</T>}
      </button>
    </form>
  );
}
