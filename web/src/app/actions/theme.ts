"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { THEME_COOKIE_NAME, THEME_VALUES, type Theme } from "@/lib/theme";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Lot "Apparence" — voir src/lib/theme.ts pour le choix cookie vs compte. */
export async function setTheme(theme: Theme) {
  await verifySession();

  if (!(THEME_VALUES as readonly string[]).includes(theme)) {
    // Défense en profondeur : les deux seuls appelants (les formulaires de
    // settings/theme-section.tsx) n'envoient jamais autre chose que "dark"
    // ou "light", mais une valeur de cookie arbitraire ne doit jamais être
    // acceptée silencieusement.
    throw new Error(`Thème invalide : ${theme}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + ONE_YEAR_MS),
  });

  // Le layout racine (où data-theme est posé) doit être revalidé pour que le
  // nouveau thème s'applique immédiatement, pas seulement après une future
  // navigation.
  revalidatePath("/", "layout");
}
