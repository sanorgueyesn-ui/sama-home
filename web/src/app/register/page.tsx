import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTheme } from "@/lib/theme";
import { AuthLogo } from "@/components/auth/auth-logo";
import { FeatureList } from "@/components/auth/feature-list";
import { ThemeToggleButton } from "@/components/auth/theme-toggle-button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { DecorativeBlobs } from "@/components/auth/decorative-blobs";
import { getPublicPricingSettings } from "@/lib/platform-settings-data";
import { RegisterForm } from "./register-form";
import { isBillingCycle, isPlanTier, planOffer } from "@/lib/subscription-plans";
import { T } from "@/components/i18n/i18n-provider";

export default async function RegisterPage(props: {
  searchParams?: Promise<{
    google?: string;
    email?: string;
    name?: string;
    token?: string;
    category?: string;
    mode?: string;
    plan?: string;
    billing?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const initialMode = searchParams?.mode || searchParams?.category || "RESIDENCE";

  // Test local des tableaux de bord sans barrière d'inscription : uniquement en développement
  // avec DEV_BYPASS_AUTH=true (même garde que src/lib/dal.ts et la page de connexion).
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS_AUTH === "true") {
    redirect(`/dashboard?mode=${initialMode}`);
  }

  const [theme, pricing] = await Promise.all([
    getTheme(),
    getPublicPricingSettings(),
  ]);

  // Formule choisie sur la page d'accueil (?category=…&plan=…&billing=…) : prix lus dans la grille, jamais dans l'adresse.
  const modeName = initialMode.toUpperCase() === "HOTEL" ? "HOTEL" : "RESIDENCE";
  const tierName = (searchParams?.plan ?? "essential").toUpperCase();
  const tier = isPlanTier(tierName) ? tierName : "ESSENTIAL";
  const cycle = isBillingCycle(searchParams?.billing) ? searchParams.billing : "monthly";
  const offer = planOffer(modeName, tier, cycle);
  const chosenPlan = offer ? { name: offer.name, amountFcfa: offer.amountFcfa, periodMonths: offer.periodMonths, tier, cycle } : null;

  const isGoogle = searchParams?.google === "1";
  const initialEmail = searchParams?.email ?? "";
  const initialName = searchParams?.name ?? "";
  const googleToken = searchParams?.token ?? "";


  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
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
            <T>Votre activité,</T>
            <br />
            <T>en toute simplicité</T>
          </h1>
          <div className="mt-3 h-1 w-14 rounded-full bg-brand-orange" aria-hidden />

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
            <T>Gérez vos logements, vos réservations, vos clients et vos revenus
            avec un seul outil, simple et efficace.</T>
          </p>

          <FeatureList />

          <div className="mt-10 flex gap-2" aria-hidden>
            <span className="h-1.5 w-5 rounded-full bg-brand-orange" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-surface px-4 py-8 sm:px-6 lg:w-1/2 lg:px-12">
        <DecorativeBlobs />

        <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <AuthLogo variant="light" />
            <ThemeToggleButton current={theme} />
          </div>

          <div className="rounded-3xl bg-surface-raised p-5 shadow-card sm:p-8">
            <h2 className="text-xl font-extrabold text-fg">
              <T>Créez votre espace</T>
              <br />
              <T>SAMA HOME</T>
            </h2>
            <p className="mt-1 mb-6 text-sm font-medium text-fg/60">
              <T>Gérez vos logements, réservations et revenus au même endroit.</T>
            </p>

            <RegisterForm
              pricing={pricing}
              isGoogle={isGoogle}
              initialEmail={initialEmail}
              initialName={initialName}
              googleToken={googleToken}
              initialMode={initialMode}
              chosenPlan={chosenPlan}
            />

            {!isGoogle && (
              <div className="mt-6">
                <OAuthButtons />
              </div>
            )}

            <p className="mt-6 text-center text-sm font-medium text-fg/60">
              <T>Déjà un compte ?</T>{" "}
              <Link href="/login" className="font-bold text-fg underline underline-offset-2 hover:no-underline">
                <T>Se connecter</T>
              </Link>
            </p>

            <div className="mt-8 border-t border-border/15 pt-4 text-center">
              <p className="text-[11px] font-bold text-fg/50">
                <T>SAMA HOME • Édité par</T> <span className="font-extrabold text-fg/80"><T>COMPAGNIE GUEYE TAWFEKH</T></span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-fg/40">
                <T>NINEA : 012521599 2R1 • RCCM : SN.DKR.2025.A.38803 • Dakar, Sénégal</T>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
