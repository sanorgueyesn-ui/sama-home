// Les 10 présentations visuelles des contrats (et des quittances de loyer, qui en reprennent l'habillage).
// Module PUR : de simples descriptions, sans React ni PDF. Le moteur de rendu (contract-document.tsx) les
// lit pour mettre en page un MÊME contenu (contract-clauses.ts). Choisir un habillage ne change jamais le
// texte du contrat.

export type ContractHeaderStyle = "classic" | "elegant" | "band" | "bar" | "frame" | "minimal" | "banner" | "form" | "soft" | "editorial";
export type ContractPartiesStyle = "columns" | "divided" | "cards" | "table" | "boxes" | "soft";
export type ContractArticleStyle = "rule" | "centered" | "circle" | "bar" | "plain" | "box" | "square" | "soft";

export type ContractTheme = {
  id: number;
  slug: string;
  name: string;
  description: string;
  font: "serif" | "sans";
  header: ContractHeaderStyle;
  parties: ContractPartiesStyle;
  article: ContractArticleStyle;
  /** Bande de couleur le long du bord gauche de chaque page. */
  sideBand?: boolean;
  /** Double filet autour de chaque page. */
  frame?: boolean;
  /** Colonne latérale des faits essentiels, articles à droite. */
  sidebar?: boolean;
};

export const CONTRACT_THEMES: readonly ContractTheme[] = [
  { id: 1, slug: "classique", name: "Classique", description: "Sobre et juridique : serif, titre centré, filets fins.", font: "serif", header: "classic", parties: "columns", article: "rule" },
  { id: 2, slug: "moderne", name: "Moderne", description: "Bande de couleur sur le bord, titre fort, cartes claires.", font: "sans", header: "band", parties: "cards", article: "circle", sideBand: true },
  { id: 3, slug: "elegant", name: "Élégant", description: "Serif aéré, nom en petites capitales, filet d'accent.", font: "serif", header: "elegant", parties: "divided", article: "centered" },
  { id: 4, slug: "corporate", name: "Corporate", description: "Bandeau pleine largeur, tableau des parties, articles à liseré.", font: "sans", header: "bar", parties: "table", article: "bar" },
  { id: 5, slug: "minimal", name: "Minimal", description: "Beaucoup de blanc, filets fins, petites étiquettes.", font: "sans", header: "minimal", parties: "table", article: "plain" },
  { id: 6, slug: "prestige", name: "Prestige", description: "Double cadre, serif centré, parties encadrées.", font: "serif", header: "frame", parties: "boxes", article: "centered", frame: true },
  { id: 7, slug: "bandeau", name: "Bandeau", description: "Grand bandeau d'accent en tête, pastilles carrées.", font: "sans", header: "banner", parties: "cards", article: "square" },
  { id: 8, slug: "editorial", name: "Éditorial", description: "Deux colonnes : l'essentiel à gauche, les articles à droite.", font: "serif", header: "editorial", parties: "table", article: "plain", sidebar: true },
  { id: 9, slug: "administratif", name: "Administratif", description: "Formulaire : champs encadrés, articles dans des cases.", font: "sans", header: "form", parties: "boxes", article: "box" },
  { id: 10, slug: "chaleureux", name: "Chaleureux", description: "Cartes arrondies, teintes douces, pastilles d'accent.", font: "sans", header: "soft", parties: "soft", article: "soft" },
];

export function contractThemeById(id: number): ContractTheme | null {
  return CONTRACT_THEMES.find((theme) => theme.id === id) ?? null;
}
