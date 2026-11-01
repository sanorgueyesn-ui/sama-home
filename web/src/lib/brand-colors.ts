/**
 * Lot "Personnalisation des couleurs" — module central de résolution de la
 * palette de marque. Fonction PURE (aucune dépendance Prisma/server-only/
 * cookies ici — même esprit que src/lib/theme.ts pour la logique, mais sans
 * accès direct à l'environnement), prend en paramètre les 3 colonnes déjà
 * lues ailleurs (`Settings.primaryColor`/`secondaryColor`/`accentColor`).
 *
 * Les 5 palettes sont décrites ci-dessous avec leurs rôles (principale, secondaire,
 * accent) et vérifiées par des tests de contraste. La palette 1 reprend
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
  | "terre-lavande"
  | "noir-jaune-violet"
  | "aubergine-dore"
  | "noir-electrique";

/** Rôle de chaque couleur dans l'application (voir layout.tsx et globals.css). */
export const BRAND_ROLES: Record<keyof BrandColors, { label: string; hint: string }> = {
  primary: { label: "Couleur principale", hint: "Boutons de validation, titres, éléments forts. Texte blanc dessus." },
  secondary: { label: "Couleur secondaire", hint: "Badges, repères et touches de contraste." },
  accent: { label: "Couleur d'accent", hint: "Actions principales, liens et éléments actifs. Texte sombre dessus." },
};

export type BrandPalette = {
  id: BrandPaletteId;
  label: string;
  description: string;
  /** Nom courant de chaque couleur, affiché sous les pastilles. */
  names: Record<keyof BrandColors, string>;
  colors: BrandColors;
};

/**
 * Cinq combinaisons prêtes à l'emploi. Règle de rôle respectée par chacune : la couleur PRINCIPALE
 * est assez foncée pour porter du texte blanc, la couleur d'ACCENT est assez claire ou vive pour
 * porter du texte sombre (les boutons d'action). L'ordre des couleurs de la maquette d'origine est
 * donc réparti selon ces rôles, jamais subi.
 */
export const BRAND_PALETTES: readonly BrandPalette[] = [
  {
    id: "default",
    label: "SAMA HOME classique",
    description: "La couleur de la marque : bleu nuit, corail et ambre.",
    names: { primary: "Bleu nuit", secondary: "Corail", accent: "Ambre" },
    colors: { primary: "#12304A", secondary: "#E5484D", accent: "#F59E0B" },
  },
  {
    id: "terre-lavande",
    label: "Terre et lavande",
    description: "Chaleureux et doux : un marron profond, de l'argent et une touche de lavande.",
    names: { primary: "Marron", secondary: "Argenté", accent: "Violet lavande" },
    colors: { primary: "#6B4F3B", secondary: "#C0C0C0", accent: "#D8B4FE" },
  },
  {
    id: "noir-jaune-violet",
    label: "Noir, violet et jaune",
    description: "Contrasté et énergique : noir profond, violet vif et jaune éclatant.",
    names: { primary: "Noir profond", secondary: "Violet", accent: "Jaune éclatant" },
    colors: { primary: "#000000", secondary: "#8A2BE2", accent: "#FFD600" },
  },
  {
    id: "aubergine-dore",
    label: "Aubergine et or",
    description: "Élégant et haut de gamme : violet aubergine, argent et doré.",
    names: { primary: "Violet aubergine", secondary: "Argenté", accent: "Doré" },
    colors: { primary: "#4B0082", secondary: "#C0C0C0", accent: "#D4AF37" },
  },
  {
    id: "noir-electrique",
    label: "Noir électrique",
    description: "Moderne et percutant : noir profond, bleu électrique et rouge néon.",
    names: { primary: "Noir profond", secondary: "Bleu électrique", accent: "Rouge néon" },
    colors: { primary: "#000000", secondary: "#007BFF", accent: "#FF073A" },
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


// ---------------------------------------------------------------------------------------------
// Lisibilité : fonctions PURES de contraste (WCAG 2.x). Elles servent trois fois, toujours avec les
// mêmes formules : l'éditeur d'apparence (avertissements), la mise en page (couleurs réellement
// appliquées selon le thème) et les tests. Les couleurs ENREGISTRÉES ne sont jamais modifiées : on
// n'adapte que ce qui est affiché, pour qu'un noir ou un jaune reste lisible en sombre comme en clair.
// ---------------------------------------------------------------------------------------------

export type ThemeName = "dark" | "light";

/** Surfaces de référence (globals.css) et encre des boutons d'accent. */
export const SURFACE_LIGHT = "#E9E7E0";
export const SURFACE_DARK = "#0B141A";
export const INK_COLOR = "#172026";
const WHITE = "#FFFFFF";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste de 1 (identique) à 21 (noir sur blanc). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mélange `hex` avec `target` : t = 0 → hex, t = 1 → target. */
export function mixHex(hex: string, target: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

/** Éclaircit ou assombrit `hex` par pas de 2 % jusqu'à atteindre `minRatio` contre `surface`. */
function adjustUntil(hex: string, surface: string, minRatio: number, target: string): string {
  let current = hex;
  for (let t = 0; t <= 1 && contrastRatio(current, surface) < minRatio; t += 0.02) {
    current = mixHex(hex, target, t);
  }
  return current;
}

/**
 * Couleur principale telle qu'AFFICHÉE (fond des boutons « navy »). En thème sombre, un noir ou un
 * violet très foncé disparaît sur le fond : on l'éclaircit juste assez pour rester visible. Le
 * bleu nuit classique est déjà visible et n'est donc pas modifié. En thème clair : inchangée.
 */
export function displayPrimary(primary: string, theme: ThemeName): string {
  if (theme !== "dark") return primary;
  return adjustUntil(primary, SURFACE_DARK, 1.3, WHITE);
}

/**
 * Couleur d'accent utilisée comme TEXTE ou comme icône (liens, repères actifs). Un jaune ou une
 * lavande sur fond clair serait illisible : on l'assombrit jusqu'à un contraste de 3,6. En sombre,
 * on l'éclaircit jusqu'à 4 si besoin. Le fond des boutons d'accent n'est pas concerné (il garde la
 * vraie couleur, avec du texte sombre dessus).
 */
export function displayAccentText(accent: string, theme: ThemeName): string {
  return theme === "dark"
    ? adjustUntil(accent, SURFACE_DARK, 4, WHITE)
    : adjustUntil(accent, SURFACE_LIGHT, 3.6, "#000000");
}

export type ContrastCheck = { ratio: number; ok: boolean; message: string };

/** Vérifications montrées dans l'éditeur : le texte blanc sur la principale, le texte sombre sur l'accent. */
export function checkBrandContrast(colors: BrandColors): { primary: ContrastCheck; accent: ContrastCheck } {
  const primary = contrastRatio(colors.primary, WHITE);
  const accent = contrastRatio(colors.accent, INK_COLOR);
  return {
    primary: {
      ratio: primary,
      ok: primary >= 4.5,
      message:
        primary >= 4.5
          ? "Texte blanc bien lisible sur cette couleur."
          : "Le texte blanc sera difficile à lire : choisissez une couleur plus foncée.",
    },
    accent: {
      ratio: accent,
      ok: accent >= 3,
      message:
        accent >= 3
          ? "Texte sombre bien lisible sur cette couleur."
          : "Le texte sombre des boutons sera difficile à lire : choisissez une couleur plus claire.",
    },
  };
}
