import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { MenuIcon } from "@/components/landing/landing-icons";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import type { Theme } from "@/lib/theme-constants";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

export const HEADER_HEIGHT_CLASS = "h-16";

export const BUTTON_PRIMARY =
  "group relative inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-(--accent) px-5 text-center text-sm font-extrabold text-(--accent-ink) transition-all duration-200 hover:bg-(--accent-hover) motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--th-focus)";
export const BUTTON_SECONDARY =
  "group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border/25 bg-surface-raised px-5 text-center text-sm font-bold text-fg transition-all duration-200 hover:bg-surface-sunken hover:border-border/40 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--th-focus)";

async function BrandLink() {
  const t = await getT();
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--th-focus)" aria-label={t("SAMA HOME")}>
      <span className="relative inline-flex h-9 w-9 shrink-0">
        <Image
          src="/brand/Sama-Home-icone-Bleu-nuit.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 [[data-theme=dark]_&]:hidden"
        />
        <Image
          src="/brand/Sama-Home-icone-Blanc-cassé.png"
          alt=""
          width={36}
          height={36}
          className="hidden h-9 w-9 [[data-theme=dark]_&]:block"
        />
      </span>
      <span className="hidden text-lg font-black tracking-wide min-[400px]:inline">
        <span className="text-(--accent-text)">SAMA</span> <span className="text-fg">HOME</span>
      </span>
    </Link>
  );
}

export async function LandingHeader({ locale, theme, m }: { locale: Locale; theme: Theme; m: Messages }) {
  const t = await getT();
  const links = [
    { href: "#activites", label: m.landing.nav.offers },
    { href: "#fonctionnalites", label: "Fonctionnalités" },
    { href: "#tarifs", label: m.landing.nav.pricing },
    { href: "#faq", label: "FAQ" },
    { href: "#contact", label: m.landing.nav.contact },
  ];

  return (
    <header className={`fixed inset-x-0 top-0 z-50 ${HEADER_HEIGHT_CLASS} border-b border-border/10 bg-surface/95 backdrop-blur`}>
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLink />

        <nav aria-label={t("Navigation principale")} className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-fg/75 transition hover:bg-fg/5 hover:text-fg focus-visible:outline-2 focus-visible:outline-(--th-focus)"
            >
              <T>{link.label}</T>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher locale={locale} labels={m.common} />
          <ThemeSwitcher theme={theme} labels={m.common} />

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-fg/80 transition hover:text-fg focus-visible:outline-2 focus-visible:outline-(--th-focus)"
            >
              {m.common.logIn}
            </Link>
            <Link href="/register" className={`${BUTTON_PRIMARY} !h-10 whitespace-nowrap`}>
              <T>Essai gratuit</T>
            </Link>
          </div>

          <details className="group relative sm:hidden">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-border/25 bg-surface-raised text-fg [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-(--th-focus)"
              aria-label={m.common.menu}
            >
              <MenuIcon className="h-5 w-5" />
            </summary>
            <div className="absolute end-0 top-12 w-60 rounded-2xl border border-border/20 bg-surface-raised p-3 shadow-card">
              <nav aria-label={t("Menu mobile")} className="flex flex-col">
                {links.map((link) => (
                  <a key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-fg hover:bg-fg/5">
                    <T>{link.label}</T>
                  </a>
                ))}
              </nav>
              <div className="mt-2 flex flex-col gap-2 border-t border-border/15 pt-2.5">
                <Link href="/login" className={BUTTON_SECONDARY}>
                  {m.common.logIn}
                </Link>
                <Link href="/register" className={BUTTON_PRIMARY}>
                  <T>Essai gratuit</T>
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
