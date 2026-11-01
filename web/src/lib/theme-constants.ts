// Constantes et types du thème, SANS dépendance serveur : importables depuis un composant
// serveur ou client, une action serveur ou un test. La lecture du cookie (côté serveur
// uniquement) reste dans src/lib/theme.ts, qui réexporte ces valeurs.

export const THEME_COOKIE_NAME = "sama_theme";
export const THEME_VALUES = ["dark", "light"] as const;
export type Theme = (typeof THEME_VALUES)[number];
/** Comportement par défaut inchangé depuis la reconstruction UI (dark premium). */
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEME_VALUES as readonly string[]).includes(value);
}
