import Image from "next/image";
import Link from "next/link";
import { getTheme } from "@/lib/theme";
import { AuthLogo } from "@/components/auth/auth-logo";
import { FeatureList } from "@/components/auth/feature-list";
import { ThemeToggleButton } from "@/components/auth/theme-toggle-button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { DecorativeBlobs } from "@/components/auth/decorative-blobs";
import { LoginForm } from "./login-form";

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured:
    "La connexion Google nécessite la configuration de GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans votre console ou votre fichier .env.",
  google_cancelled: "La connexion avec Google a été annulée.",
  invalid_state: "Session de connexion expirée. Veuillez réessayer.",
  google_token_failed: "Échec de validation auprès de Google. Veuillez réessayer.",
  google_userinfo_failed: "Impossible de récupérer votre profil Google.",
  google_no_email: "Aucune adresse e-mail reçue de Google.",
  establishment_pending: "Votre établissement est en attente d'approbation par l'administrateur de SAMA HOME.",
  establishment_rejected: "La demande d'inscription pour cet établissement a été refusée.",
  establishment_suspended: "L'accès pour cet établissement est suspendu. Veuillez contacter le support.",
  google_error: "Une erreur inattendue est survenue lors de la connexion avec Google.",
};

export default async function LoginPage(props: {
  searchParams?: Promise<{
    error?: string;
    google_verified?: string;
    username?: string;
    establishment?: string;
    token?: string;
    resetSuccess?: string;
  }>;
}) {
  const [theme, searchParams] = await Promise.all([
    getTheme(),
    props.searchParams,
  ]);
  const errorCode = searchParams?.error;
  const errorMessage = errorCode ? OAUTH_ERRORS[errorCode] ?? "Erreur de connexion." : null;
  const isGoogleVerified = searchParams?.google_verified === "1";
  const googleUsername = searchParams?.username ?? "";
  const googleEstablishment = searchParams?.establishment ?? "";
  const googleToken = searchParams?.token ?? "";
  const isResetSuccess = searchParams?.resetSuccess === "1";


  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panneau identité — desktop uniquement (>= lg). Photographie réelle
          déjà présente dans le projet (public/images/hero/sama-home-default-
          hero.png, déjà suivie par Git). Overlay neutre (noir/navy
          translucides) pour la lisibilité, jamais une seconde couleur de
          marque codée en dur. */}
      <div className="relative hidden overflow-hidden px-14 py-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-center">
        <Image
          src="/images/hero/sama-home-default-hero.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy/90 via-navy/80 to-black/85" />

        <div className="relative">
          <AuthLogo variant="dark" />

          <h1 className="mt-10 text-4xl font-extrabold leading-tight text-white">
            Votre activité,
            <br />
            en toute simplicité
          </h1>
          <div className="mt-3 h-1 w-14 rounded-full bg-brand-orange" aria-hidden />

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
            Gérez vos logements, vos réservations, vos clients et vos revenus
            avec un seul outil, simple et efficace.
          </p>

          <FeatureList />

          <div className="mt-10 flex gap-2" aria-hidden>
            <span className="h-1.5 w-5 rounded-full bg-brand-orange" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* Panneau formulaire — tokens sémantiques uniquement (surface,
          surface-raised, fg, border) : jamais de blanc pur. En dessous de
          `lg:` (tablette/mobile), fond doux + décorations abstraites,
          jamais la photographie. */}
      <div className="relative flex flex-1 items-center justify-center bg-surface px-6 py-10 lg:w-1/2 lg:px-16">
        <DecorativeBlobs />

        <div className="relative w-full max-w-sm sm:max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <AuthLogo variant="light" />
            <ThemeToggleButton current={theme} />
          </div>

          <div className="rounded-3xl bg-surface-raised p-7 shadow-card sm:p-9">
            <h2 className="text-xl font-extrabold text-fg">Connexion</h2>
            <p className="mt-1 mb-6 text-sm font-medium text-fg/60">
              Accédez à votre espace de gestion.
            </p>

            {isResetSuccess && (
              <div role="status" className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    ✓
                  </span>
                  <p className="font-extrabold">Mot de passe réinitialisé avec succès</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                  Votre mot de passe a bien été mis à jour. Vous pouvez maintenant vous connecter à votre compte.
                </p>
              </div>
            )}

            {errorMessage && (
              <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger-bg p-3 text-xs font-semibold text-danger">
                {errorMessage}
              </div>
            )}

            {isGoogleVerified && (
              <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    ✓
                  </span>
                  <p className="font-extrabold">Compte Google validé : {googleUsername}</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                  {googleEstablishment ? <>Établissement <strong>« {googleEstablishment} »</strong>. </> : null}
                  Pour votre sécurité, veuillez saisir votre mot de passe pour accéder à votre espace.
                </p>
              </div>
            )}

            <LoginForm
              defaultUsername={googleUsername}
              isGoogleVerified={isGoogleVerified}
              googleToken={googleToken}
            />

            {!isGoogleVerified && (
              <div className="mt-6">
                <OAuthButtons />
              </div>
            )}


            <p className="mt-6 text-center text-sm font-medium text-fg/60">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-bold text-navy underline-offset-2 hover:underline">
                Créer mon espace
              </Link>
            </p>

            <div className="mt-8 border-t border-border/15 pt-4 text-center">
              <p className="text-[11px] font-bold text-fg/50">
                SAMA HOME • Édité par <span className="font-extrabold text-fg/80">COMPAGNIE GUEYE TAWFEKH</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-fg/40">
                NINEA : 012521599 2R1 • RCCM : SN.DKR.2025.A.38803 • Dakar, Sénégal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
