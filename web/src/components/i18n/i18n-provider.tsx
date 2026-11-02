"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { setClientLocale } from "@/lib/i18n/date-locale";
import { createT, type PhraseBook, type TFunction } from "@/lib/i18n/translate";

type I18nValue = { locale: Locale; t: TFunction };

const FALLBACK: I18nValue = { locale: DEFAULT_LOCALE, t: createT({}) };
const I18nContext = createContext<I18nValue>(FALLBACK);

/**
 * Langue et recueil de phrases pour les composants client ET pour le rendu serveur de leur HTML. Posé
 * une fois dans la page racine : le premier affichage est déjà dans la bonne langue, sans clignotement.
 * En français le recueil est vide, donc rien n'est envoyé au navigateur.
 */
export function I18nProvider({ locale, book, children }: { locale: Locale; book: PhraseBook; children: ReactNode }) {
  setClientLocale(locale);
  const value = useMemo<I18nValue>(() => ({ locale, t: createT(book) }), [locale, book]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Fonction de traduction pour un composant client : `const t = useT(); t("Enregistrer")`. */
export function useT(): TFunction {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/**
 * Texte traduit à l'écran : `<T>Réservations</T>`. Un texte simple est traduit ; tout autre contenu
 * (éléments, expressions mêlées) est rendu tel quel. Marche dans un composant serveur comme dans un
 * composant client, sans rien changer à la fonction qui l'entoure.
 */
export function T({ children, values }: { children: ReactNode; values?: Record<string, string | number> }) {
  const t = useT();
  return <>{typeof children === "string" ? t(children, values) : children}</>;
}
