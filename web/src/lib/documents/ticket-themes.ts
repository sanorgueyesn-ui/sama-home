// Les 10 présentations visuelles des tickets de caisse (hôtel). Module PUR : de simples descriptions ; le
// moteur de rendu (ticket-document.tsx) les met en page. Choisir une présentation ne change jamais les
// montants ni les mentions du ticket.
import type { TicketKind, TicketWidth } from "./types";

export type TicketHeaderStyle = "plain" | "inverted" | "boxed" | "accent" | "compact" | "ornate";
export type TicketSeparator = "dashed" | "dotted" | "solid" | "double" | "thick" | "none";
export type TicketTotalStyle = "line" | "big" | "boxed" | "inverted" | "hero";
export type TicketLinesStyle = "simple" | "table" | "compact";

export type TicketTheme = {
  id: number;
  slug: string;
  name: string;
  description: string;
  font: "mono" | "sans" | "serif";
  header: TicketHeaderStyle;
  separator: TicketSeparator;
  total: TicketTotalStyle;
  lines: TicketLinesStyle;
  /** Ticket entouré d'un cadre. */
  frame?: boolean;
  /** QR code de la référence et ligne de signature. */
  qr?: boolean;
  /** Talon détachable en bas, conservé par l'établissement. */
  stub?: boolean;
};

export const TICKET_THEMES: readonly TicketTheme[] = [
  { id: 1, slug: "classique", name: "Classique", description: "Machine à reçu : police à chasse fixe, pointillés.", font: "mono", header: "plain", separator: "dashed", total: "line", lines: "simple" },
  { id: 2, slug: "moderne", name: "Moderne", description: "Bandeau de couleur en tête, montant en gras.", font: "sans", header: "inverted", separator: "solid", total: "big", lines: "simple" },
  { id: 3, slug: "compact", name: "Compact", description: "Le strict nécessaire, pour économiser le papier.", font: "sans", header: "compact", separator: "solid", total: "line", lines: "compact" },
  { id: 4, slug: "detaille", name: "Détaillé", description: "Tableau des lignes, TVA et paiements bien séparés.", font: "sans", header: "plain", separator: "dotted", total: "boxed", lines: "table" },
  { id: 5, slug: "elegant", name: "Élégant", description: "Serif, double filet, nom en lettres espacées.", font: "serif", header: "ornate", separator: "double", total: "line", lines: "simple" },
  { id: 6, slug: "bandeau", name: "Bandeau", description: "En-tête d'accent et titre sur bande noire.", font: "sans", header: "accent", separator: "thick", total: "inverted", lines: "simple" },
  { id: 7, slug: "encadre", name: "Encadré", description: "Tout le ticket dans un cadre fin.", font: "mono", header: "boxed", separator: "dotted", total: "line", lines: "simple", frame: true },
  { id: 8, slug: "grand-montant", name: "Grand montant", description: "Le montant encaissé en très grand, au centre.", font: "sans", header: "plain", separator: "none", total: "hero", lines: "compact" },
  { id: 9, slug: "talon", name: "Avec talon", description: "Reçu pour le client et talon détachable pour l'hôtel.", font: "sans", header: "plain", separator: "dashed", total: "line", lines: "simple", stub: true },
  { id: 10, slug: "qr", name: "QR et signature", description: "QR code de la référence et ligne de signature.", font: "sans", header: "plain", separator: "solid", total: "boxed", lines: "simple", qr: true },
];

export function ticketThemeById(id: number): TicketTheme | null {
  return TICKET_THEMES.find((theme) => theme.id === id) ?? null;
}

export const TICKET_KIND_LABELS: Record<TicketKind, string> = {
  ARRHES: "Arrhes à la réservation",
  PAYMENT: "Encaissement partiel du séjour",
  BALANCE: "Solde de départ",
  DEPOSIT: "Caution encaissée",
  DEPOSIT_REFUND: "Remboursement de caution",
  EXTRAS: "Extras (restaurant, blanchisserie…)",
  STAY_SUMMARY: "Récapitulatif de séjour",
  DUPLICATE: "Duplicata",
};

export const TICKET_TITLES: Record<TicketKind, string> = {
  ARRHES: "REÇU D'ARRHES",
  PAYMENT: "REÇU DE PAIEMENT",
  BALANCE: "SOLDE DU SÉJOUR",
  DEPOSIT: "CAUTION ENCAISSÉE",
  DEPOSIT_REFUND: "CAUTION RESTITUÉE",
  EXTRAS: "NOTE D'EXTRAS",
  STAY_SUMMARY: "RÉCAPITULATIF DE SÉJOUR",
  DUPLICATE: "DUPLICATA",
};

/** Libellé du montant porté par CE ticket. */
export const TICKET_AMOUNT_LABELS: Record<TicketKind, string> = {
  ARRHES: "Arrhes reçues",
  PAYMENT: "Montant reçu",
  BALANCE: "Solde réglé",
  DEPOSIT: "Caution reçue",
  DEPOSIT_REFUND: "Caution restituée",
  EXTRAS: "Extras réglés",
  STAY_SUMMARY: "Total réglé",
  DUPLICATE: "Montant",
};

/** Largeur du papier en points PDF (1 mm = 2,8346 pt) : rouleaux de 58 et 80 mm ; A4 pour la colonne. */
export const TICKET_PAPER: Record<TicketWidth, { widthPt: number; padding: number; scale: number }> = {
  "58": { widthPt: 164.41, padding: 8, scale: 0.88 },
  "80": { widthPt: 226.77, padding: 11, scale: 1 },
  a4: { widthPt: 595.28, padding: 0, scale: 1.2 },
};
