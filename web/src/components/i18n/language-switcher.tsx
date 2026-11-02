import { setLocale } from "@/app/actions/locale";
import { OFFERED_LOCALES, LOCALE_INFO, isSelectableLocale, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

/**
 * Sélecteur de langue RÉUTILISABLE (landing, connexion, tableau de bord, futurs modules
 * Résidence / Hôtel / Agence, logiciel installé). Composant serveur sans JavaScript client :
 * chaque bouton envoie un petit formulaire à l'action `setLocale`, donc il fonctionne même
 * avant le chargement complet de la page.
 *
 * Honnêteté : une langue dont la traduction n'est pas terminée est affichée désactivée avec
 * la mention « bientôt disponible » ; seul le français est actif. Hors production, elle est
 * activable en « aperçu » pour contrôler la mise en page (arabe de droite à gauche), et le
 * libellé le dit.
 */
export function LanguageSwitcher({
  locale,
  labels,
  className = "",
}: {
  locale: Locale;
  labels: Messages["common"];
  className?: string;
}) {
  return (
    <form action={setLocale} className={className}>
      <div
        role="group"
        aria-label={labels.language}
        className="inline-flex items-center gap-0.5 rounded-full border border-border/20 bg-surface-raised p-0.5"
      >
        {OFFERED_LOCALES.map((code) => {
          const info = LOCALE_INFO[code];
          const current = code === locale;
          const selectable = isSelectableLocale(code);
          const preview = selectable && info.status !== "ready";
          const note = !selectable ? labels.languageSoon : preview ? labels.languagePreview : "";
          const accessibleName = note ? `${info.nativeName} — ${note}` : info.nativeName;
          // Couleur d'accent : variable locale de la page (ex. landing, orange adouci) avec repli sur l'orange de marque.
          const base =
            "inline-flex h-11 min-w-9 items-center justify-center rounded-full px-2 sm:min-w-11 sm:px-2.5 text-xs font-extrabold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--th-focus,var(--accent,var(--color-brand-orange)))]";
          const state = current
            ? "bg-[var(--accent,var(--color-brand-orange))] text-[var(--accent-ink,var(--color-ink))]"
            : selectable
              ? "text-fg/80 hover:bg-fg/10 cursor-pointer"
              : "cursor-not-allowed text-fg/35";
          return (
            <button
              key={code}
              type="submit"
              name="locale"
              value={code}
              disabled={!selectable || current}
              aria-current={current ? "true" : undefined}
              aria-label={accessibleName}
              title={accessibleName}
              className={`${base} ${state}`}
            >
              {info.shortLabel}
            </button>
          );
        })}
      </div>
    </form>
  );
}
