// Langue des dates et heures. Module sans dépendance serveur : importable partout.
//  - côté serveur (composants serveur) : `getLocale()` mémorise la langue de la requête (cache React) ;
//  - côté client (rendu serveur du client + navigateur) : `I18nProvider` la mémorise au rendu.
import { cache } from "react";
import { intlLocale, type Locale } from "./config";

const requestStore = cache(() => ({ value: null as Locale | null }));
let clientLocale: Locale = "fr";

export function setRequestLocale(locale: Locale): void {
  requestStore().value = locale;
}

export function setClientLocale(locale: Locale): void {
  clientLocale = locale;
}

/** À passer comme premier argument de `Intl.DateTimeFormat` / `toLocaleString` pour une date. */
export function dateLocale(): string {
  return intlLocale(requestStore().value ?? clientLocale);
}

/** Langue de la requête en cours (serveur) ou de la page affichée (client). */
export function currentLocale(): Locale {
  return requestStore().value ?? clientLocale;
}
