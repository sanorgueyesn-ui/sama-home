"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_COOKIE_NAME, isTheme } from "@/lib/theme-constants";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Préférence clair / sombre des pages PUBLIQUES (landing, connexion) : aucune session requise,
 * contrairement à `setTheme` (src/app/actions/theme.ts, réservé aux utilisateurs connectés).
 * Même cookie `sama_theme`, lu par le layout racine avant le premier rendu.
 *
 * La valeur vient d'un formulaire, donc du navigateur : elle n'est acceptée que si elle figure
 * dans la liste fixe `THEME_VALUES`. Toute autre valeur est ignorée sans erreur ni écriture.
 */
export async function setThemePreference(formData: FormData): Promise<void> {
  const theme = formData.get("theme");
  if (!isTheme(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + ONE_YEAR_MS),
  });

  revalidatePath("/", "layout");
}
