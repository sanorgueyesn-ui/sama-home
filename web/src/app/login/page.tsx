import Image from "next/image";
import Link from "next/link";
import { getTheme } from "@/lib/theme";
import { AuthLogo } from "@/components/auth/auth-logo";
import { FeatureList } from "@/components/auth/feature-list";
import { ThemeToggleButton } from "@/components/auth/theme-toggle-button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { DecorativeBlobs } from "@/components/auth/decorative-blobs";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const theme = await getTheme();

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

            <LoginForm />

            <div className="mt-6">
              <OAuthButtons />
            </div>

            <p className="mt-6 text-center text-sm font-medium text-fg/60">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-bold text-navy underline-offset-2 hover:underline">
                Créer mon espace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
