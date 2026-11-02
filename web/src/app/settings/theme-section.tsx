import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

const MOON_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

const SUN_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const BASE =
  "flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange";
const ON = "bg-fg text-surface";
const OFF = "text-fg/65 hover:bg-fg/[0.06] hover:text-fg";

/**
 * Sélecteur sombre/clair à sélection exclusive, en pastille (même langage visuel que la barre des
 * paramètres). Même patron d'accessibilité que les groupes "Type de pièce" : `aria-pressed`, jamais
 * `role="radio"`. Pas besoin de "use client" : chaque bouton est son propre <form> appelant
 * directement l'action serveur `setTheme` avec sa valeur fixe — aucun état local, la revalidation
 * de layout suffit à refléter le changement.
 */
export async function ThemeSection({ current }: { current: Theme }) {
  const t = await getT();
  return (
    <div role="group" aria-label={t("Thème de l'application")} className="inline-flex rounded-full border border-border/15 bg-surface-raised p-1">
      <form
        action={async () => {
          "use server";
          await setTheme("dark");
        }}
      >
        <button type="submit" aria-pressed={current === "dark"} className={`${BASE} ${current === "dark" ? ON : OFF}`}>
          {MOON_ICON} <T>Sombre</T>
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await setTheme("light");
        }}
      >
        <button type="submit" aria-pressed={current === "light"} className={`${BASE} ${current === "light" ? ON : OFF}`}>
          {SUN_ICON} <T>Clair</T>
        </button>
      </form>
    </div>
  );
}
