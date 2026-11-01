"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE_NAME, isLocale, isSelectableLocale } from "@/lib/i18n/config";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Choix de langue des pages PUBLIQUES (landing, connexion) : aucune session requise.
 *
 * La valeur vient d'un formulaire, donc du navigateur : elle n'est acceptée que si c'est une
 * langue connue ET sélectionnable (en production, une traduction non terminée est refusée).
 * Toute autre valeur est ignorée sans erreur ni écriture.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale) || !isSelectableLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + ONE_YEAR_MS),
  });

  revalidatePath("/", "layout");
}
