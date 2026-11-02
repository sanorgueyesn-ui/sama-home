import { setThemePreference } from "@/app/actions/theme-preference";
import { MoonIcon, SunIcon } from "@/components/theme/theme-icons";
import type { Messages } from "@/lib/i18n/messages";
import type { Theme } from "@/lib/theme-constants";
import { getT } from "@/lib/i18n/server";

/**
 * Sélecteur clair / sombre RÉUTILISABLE (landing, pages publiques, futur logiciel installé).
 * Composant serveur sans JavaScript client, comme le sélecteur de langue : un petit formulaire
 * envoie le thème opposé à `setThemePreference`, qui pose le cookie `sama_theme` lu par le layout
 * racine avant le premier rendu (aucun flash). L'icône montre l'état ACTUEL (soleil = clair,
 * lune = sombre) ; le libellé accessible dit l'action (« Passer en mode … »).
 */
export async function ThemeSwitcher({
  theme,
  labels,
  className = "",
}: {
  theme: Theme;
  labels: Messages["common"];
  className?: string;
}) {
  const t = await getT();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? labels.themeToLight : labels.themeToDark;
  return (
    <form action={setThemePreference} className={className}>
      <button
        type="submit"
        name="theme"
        value={next}
        aria-label={t(label)}
        title={t(label)}
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/20 bg-surface-raised text-fg/85 transition-colors hover:bg-fg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--th-focus,var(--accent,var(--color-brand-orange)))]"
      >
        {theme === "dark" ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
      </button>
    </form>
  );
}
