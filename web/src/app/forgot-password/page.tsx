import Image from "next/image";
import { getTheme } from "@/lib/theme";
import { AuthLogo } from "@/components/auth/auth-logo";
import { FeatureList } from "@/components/auth/feature-list";
import { ThemeToggleButton } from "@/components/auth/theme-toggle-button";
import { DecorativeBlobs } from "@/components/auth/decorative-blobs";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Mot de passe oublié | SAMA HOME",
  description: "Réinitialisez votre mot de passe en toute sécurité avec un code de confirmation envoyé sur votre adresse e-mail.",
};

export default async function ForgotPasswordPage() {
  const theme = await getTheme();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panneau identité — desktop uniquement */}
      <div className="relative hidden overflow-hidden px-14 py-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-center">
        <Image
          src="/images/hero/sama-home-default-hero.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy/90 via-navy/80 to-black/85"
        />

        <div className="relative">
          <AuthLogo variant="dark" />

          <h1 className="mt-10 text-4xl font-extrabold leading-tight text-white">
            Sécurité renforcée
            <br />
            pour votre espace
          </h1>
          <div className="mt-3 h-1 w-14 rounded-full bg-brand-orange" aria-hidden />

          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
            Protégez vos données et accédez à vos logements en toute sérénité grâce à notre protocole de vérification d'identité par e-mail.
          </p>

          <FeatureList />

          <div className="mt-10 flex gap-2" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="h-1.5 w-5 rounded-full bg-brand-orange" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* Panneau formulaire */}
      <div className="relative flex flex-1 items-center justify-center bg-surface px-6 py-10 lg:w-1/2 lg:px-16">
        <DecorativeBlobs />

        <div className="relative w-full max-w-sm sm:max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <AuthLogo variant="light" />
            <ThemeToggleButton current={theme} />
          </div>

          <div className="rounded-3xl bg-surface-raised p-7 shadow-card sm:p-9">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-orange">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Récupération sécurisée
              </span>
              <h2 className="mt-3 text-xl font-extrabold text-fg">Mot de passe oublié</h2>
              <p className="mt-1 text-sm font-medium text-fg/60">
                Réinitialisez l'accès à votre compte en 2 étapes rapides.
              </p>
            </div>

            <ForgotPasswordForm />

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
