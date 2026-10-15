/**
 * Lot "Personnalisation des couleurs" — module central de résolution de la
 * palette de marque. Fonction PURE (aucune dépendance Prisma/server-only/
 * cookies ici — même esprit que src/lib/theme.ts pour la logique, mais sans
 * accès direct à l'environnement), prend en paramètre les 3 colonnes déjà
 * lues ailleurs (`Settings.primaryColor`/`secondaryColor`/`accentColor`).
 *
 * Les 5 palettes et leurs codes exacts ont été validés dans le rapport
 * d'audit précédent (calcul de contraste WCAG réel). La palette 1 reprend
 * EXACTEMENT les couleurs de marque déjà en dur dans src/app/globals.css —
 * `DEFAULT_BRAND_COLORS` ne doit jamais diverger de ces valeurs.
 */

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type BrandPaletteId =
  | "default"
  | "emeraude-nocturne"
  | "bordeaux-elegant"
  | "bleu-ocean"
  | "vert-olive-terreux";

export type BrandPalette = {
  id: BrandPaletteId;
  label: string;
  colors: BrandColors;
};

export const BRAND_PALETTES: readonly BrandPalette[] = [
  {
    id: "default",
    label: "SAMA HOME classique",
    colors: { primary: "#12304A", secondary: "#E5484D", accent: "#F59E0B" },
  },
  {
    id: "emeraude-nocturne",
    label: "Émeraude nocturne",
    colors: { primary: "#0E3B36", secondary: "#C1502E", accent: "#D4A017" },
  },
  {
    id: "bordeaux-elegant",
    label: "Bordeaux élégant",
    colors: { primary: "#22303C", secondary: "#8E2436", accent: "#C08A28" },
  },
  {
    id: "bleu-ocean",
    label: "Bleu océan",
    colors: { primary: "#154360", secondary: "#D1603D", accent: "#E8A33D" },
  },
  {
    id: "vert-olive-terreux",
    label: "Vert olive terreux",
    colors: { primary: "#35422E", secondary: "#A6452E", accent: "#C9983A" },
  },
] as const;

/** Toujours la palette 1 — doit rester identique aux valeurs de globals.css. */
export const DEFAULT_BRAND_COLORS: BrandColors = BRAND_PALETTES[0].colors;

/**
 * Lot "Personnalisation libre" — format strictement `#RRGGBB` (6 chiffres
 * hexadécimaux, jamais la forme courte `#RGB`), conformément à la demande.
 * `normalizeHexColor` retourne la valeur normalisée en MAJUSCULES (même
 * convention que les littéraux de BRAND_PALETTES ci-dessus, ex. "#12304A")
 * si et seulement si le format est valide, sinon `null` — jamais une
 * correction silencieuse d'une valeur invalide. Fonction PURE, réutilisée
 * à l'identique côté client (retour visuel immédiat) et côté serveur
 * (seule validation qui compte réellement, voir saveBrandColors()).
 */
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed.toUpperCase() : null;
}

/**
 * Résout les 3 couleurs à appliquer à partir des colonnes `Settings`.
 * Retombe sur la palette par défaut COMPLÈTE (jamais un mélange partiel)
 * UNIQUEMENT si l'une des 3 colonnes est absente/vide (cohérent avec la
 * contrainte CHECK "toutes NULL ou toutes renseignées" de la migration).
 *
 * Lot "Personnalisation libre" — ne retombe PLUS sur le défaut quand le
 * triplet ne correspond à aucune des 5 palettes nommées : une couleur
 * personnalisée valide (format déjà garanti par saveBrandColors() à
 * l'écriture) doit s'appliquer telle quelle, partout (layout, contrat PDF),
 * pas seulement les 5 combinaisons prédéfinies.
 */
export function resolveBrandColors(
  settings:
    | { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null }
    | null
    | undefined,
): BrandColors {
  if (!settings?.primaryColor || !settings?.secondaryColor || !settings?.accentColor) {
    return DEFAULT_BRAND_COLORS;
  }

  return {
    primary: settings.primaryColor,
    secondary: settings.secondaryColor,
    accent: settings.accentColor,
  };
}

/**
 * Identifiant de la palette NOMMÉE active, pour savoir quelle carte
 * surligner dans BrandColorsSection — PAS pour résoudre les couleurs
 * elles-mêmes (voir resolveBrandColors() ci-dessus, désormais indépendante
 * de cette correspondance). `"default"` = les 3 colonnes sont NULL (aucune
 * personnalisation). `null` = les 3 colonnes sont renseignées mais ne
 * correspondent à AUCUNE des 5 palettes nommées — une couleur personnalisée
 * libre, qu'aucune carte ne doit représenter comme sélectionnée.
 */
export function resolvePaletteId(
  settings:
    | { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null }
    | null
    | undefined,
): BrandPaletteId | null {
  if (!settings?.primaryColor || !settings?.secondaryColor || !settings?.accentColor) {
    return "default";
  }

  const matched = BRAND_PALETTES.find(
    (palette) =>
      palette.colors.primary === settings.primaryColor &&
      palette.colors.secondary === settings.secondaryColor &&
      palette.colors.accent === settings.accentColor,
  );

  return matched?.id ?? null;
}
