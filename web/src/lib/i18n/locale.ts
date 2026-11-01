import "server-only";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(value) && isSelectableLocale(value) ? value : DEFAULT_LOCALE;
}
