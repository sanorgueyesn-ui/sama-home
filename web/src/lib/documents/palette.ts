// Couleurs d'un document PDF, dérivées de la palette de l'établissement (Paramètres > Apparence).
// Module PUR. Le papier est blanc : le texte reste toujours sombre ; l'accent ne sert qu'en aplat (avec
// une encre sombre dessus, comme les boutons) ou, assombri au besoin, en trait et en petit texte.
import { INK_COLOR, displayAccentText, mixHex, type BrandColors } from "@/lib/brand-colors";

export type PdfPalette = {
  primary: string;
  secondary: string;
  accent: string;
  /** Accent lisible comme texte ou trait sur papier blanc. */
  accentText: string;
  onPrimary: string;
  onAccent: string;
  /** Teinte très claire de la couleur principale, pour des fonds discrets. */
  tint: string;
  /** Teinte claire de l'accent, pour des pastilles ou des cartes. */
  tintAccent: string;
  ink: string;
  muted: string;
  line: string;
};

export function pdfPalette(colors: BrandColors): PdfPalette {
  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    accentText: displayAccentText(colors.accent, "light"),
    onPrimary: "#FFFFFF",
    onAccent: INK_COLOR,
    tint: mixHex(colors.primary, "#FFFFFF", 0.93),
    tintAccent: mixHex(colors.accent, "#FFFFFF", 0.82),
    ink: "#1B2420",
    muted: "#5C655F",
    line: "#D5D6D0",
  };
}
