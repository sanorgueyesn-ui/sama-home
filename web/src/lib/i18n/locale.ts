import "server-only";
import { cookies } from "next/headers";
import { setRequestLocale } from "@/lib/i18n/date-locale";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isLocale,
  isSelectableLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Langue choisie par le visiteur, lue dans le cookie côté serveur (comme le thème, voir
 * src/lib/theme.ts). Une valeur absente, inconnue ou non sélectionnable (ex. traduction non
 * terminée en production) retombe sur le français.
 */
export async function getLocale(): Promise<Locale> {
  let value: string | undefined;
  try {
    const cookieStore = await cookies();
    value = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  } catch (error) {
    // Hors requête (tests, scripts) : pas de cookie, donc français. Toute autre erreur (ex. rendu
    // statique de Next.js) doit continuer à remonter.
    if (!(error instanceof Error) || !/outside a request scope/.test(error.message)) throw error;
  }
  const locale = isLocale(value) && isSelectableLocale(value) ? value : DEFAULT_LOCALE;
  setRequestLocale(locale);
  return locale;
}
