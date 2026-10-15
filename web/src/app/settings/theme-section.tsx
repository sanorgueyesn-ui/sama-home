import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

const MOON_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);

const SUN_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

/**
 * Lot "Apparence" — sélecteur sombre/clair à sélection exclusive, même
 * patron d'accessibilité que les groupes "Type de pièce" (Lot 11B/11E) :
 * `aria-pressed`, jamais `role="radio"`. Pas besoin de "use client" : chaque
 * bouton est son propre <form> appelant directement l'action serveur
 * `setTheme` avec sa valeur fixe (même esprit que `toggleActive` ailleurs
 * dans l'app) — aucun état local, aucune préférence optimiste nécessaire, la
 * revalidation de layout suffit à refléter le changement.
 */
export function ThemeSection({ current }: { current: Theme }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-sm font-extrabold text-fg">Apparence</h2>
      <p className="mb-2 text-xs font-medium text-fg/50">
        Choisissez l&apos;apparence de SAMA HOME sur cet appareil. Le choix est conservé même après
        déconnexion ou redémarrage.
      </p>
      <div className="flex gap-2">
        <form
          action={async () => {
            "use server";
            await setTheme("dark");
          }}
          className="flex-1"
        >
          <button
            type="submit"
            aria-pressed={current === "dark"}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${
              current === "dark" ? "bg-navy text-white" : "border border-border/15 bg-surface-raised text-fg"
            }`}
          >
            {MOON_ICON} Sombre
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await setTheme("light");
          }}
          className="flex-1"
        >
          <button
            type="submit"
            aria-pressed={current === "light"}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${
              current === "light" ? "bg-navy text-white" : "border border-border/15 bg-surface-raised text-fg"
            }`}
          >
            {SUN_ICON} Clair
          </button>
        </form>
      </div>
    </section>
  );
}
