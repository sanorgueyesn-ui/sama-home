// Configuration des langues de SAMA HOME. Module pur (aucune dépendance serveur) : importable
// depuis un composant serveur, une action serveur ou un test.
//
// Honnêteté : le français et l'anglais sont terminés (écrans, formulaires, messages, page d'accueil ;
// les PDF et les messages WhatsApp aux clients restent en français). L'arabe (de droite à gauche) est
// déclaré pour préparer la mise en page mais n'est PAS proposé en production tant que sa traduction
// n'existe pas : voir `isSelectableLocale`.

export const LOCALE_COOKIE_NAME = "sama_locale";

export const LOCALES = ["fr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

/** `ready` : traduction terminée. `draft` : traduction non terminée (repli sur le français). */
export type LocaleStatus = "ready" | "draft";

export const LOCALE_INFO: Record<
  Locale,
  { nativeName: string; shortLabel: string; dir: "ltr" | "rtl"; status: LocaleStatus }
> = {
  fr: { nativeName: "Français", shortLabel: "FR", dir: "ltr", status: "ready" },
  en: { nativeName: "English", shortLabel: "EN", dir: "ltr", status: "ready" },
  ar: { nativeName: "العربية", shortLabel: "AR", dir: "rtl", status: "draft" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Une langue terminée est toujours sélectionnable. Une langue non terminée ne l'est que hors
 * production (aperçu de la mise en page) : en production, jamais de traduction à moitié faite.
 */
export function isSelectableLocale(locale: Locale): boolean {
  if (LOCALE_INFO[locale].status === "ready") return true;
  return process.env.NODE_ENV !== "production";
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return LOCALE_INFO[locale].dir;
}

/** Code Intl (dates, heures) pour une langue. L'arabe reste en français tant que sa traduction n'existe pas. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}
