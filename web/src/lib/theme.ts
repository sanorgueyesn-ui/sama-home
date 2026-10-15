import "server-only";
import { cookies } from "next/headers";

/**
 * Lot "Apparence" — préférence d'affichage sombre/clair, persistée dans un
 * cookie (jamais dans le seul état navigateur) pour survivre à une
 * reconnexion et à un redémarrage de l'application, et pour être lisible
 * côté serveur AVANT le premier rendu (voir layout.tsx) — ce qui évite tout
 * flash d'un thème incorrect au chargement, contrairement à une préférence
 * appliquée après coup depuis localStorage. Volontairement liée au
 * navigateur (cookie), pas au compte utilisateur : aucune colonne sur
 * `User`/`Settings` n'a été ajoutée pour ce lot, cohérent avec "ne pas créer
 * de nouvelle structure sans nécessité démontrée".
 */
export const THEME_COOKIE_NAME = "sama_theme";
export const THEME_VALUES = ["dark", "light"] as const;
export type Theme = (typeof THEME_VALUES)[number];
/** Comportement par défaut inchangé depuis la reconstruction UI (dark premium). */
export const DEFAULT_THEME: Theme = "dark";

function isTheme(value: string | undefined): value is Theme {
  return value !== undefined && (THEME_VALUES as readonly string[]).includes(value);
}

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE_NAME)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
