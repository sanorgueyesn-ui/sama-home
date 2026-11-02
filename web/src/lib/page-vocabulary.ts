// Vocabulaire des pages par mode métier : mêmes écrans, mots du métier. Pur (aucune base) pour rester
// testable ; `getActiveMode()` (active-mode.ts) fournit le mode de l'espace actif.
import type { ShellMode } from "@/lib/business-mode";

export type PageVocabulary = {
  /** Titre de la liste des séjours / locations en cours. */
  stays: string;
  staysSingular: string;
  /** Libellé du bouton de création d'un séjour / d'une location. */
  newStay: string;
  newStayShort: string;
  /** Les unités louées : « Chambres et appartements » / « Logements ». */
  units: string;
  unitsSingular: string;
  /** Option « tout voir » d'un filtre par unité. */
  allUnits: string;
  /** La personne hébergée. */
  guest: string;
  guests: string;
  guestsTitle: string;
  /** Départ : « Départ prévu » côté hôtel, « Fin de location » côté résidence. */
  departure: string;
  arrival: string;
  /** Texte de la liste vide des séjours en cours. */
  staysEmpty: string;
  reservationsEmpty: string;
};

const HOTEL: PageVocabulary = {
  stays: "Séjours en cours",
  staysSingular: "séjour",
  newStay: "Check-in direct",
  newStayShort: "Check-in",
  units: "Chambres et appartements",
  unitsSingular: "chambre",
  allUnits: "Toutes les chambres et appartements",
  guest: "client",
  guests: "clients",
  guestsTitle: "Clients",
  departure: "Départ prévu",
  arrival: "Arrivée",
  staysEmpty: "Aucun séjour en cours. Enregistrez une arrivée depuis une réservation, ou faites un check-in direct.",
  reservationsEmpty: "Aucune réservation. Créez-en une pour réserver une chambre ou un appartement.",
};

const RESIDENCE: PageVocabulary = {
  stays: "Locations",
  staysSingular: "location",
  newStay: "Nouvelle location",
  newStayShort: "Location",
  units: "Logements",
  unitsSingular: "logement",
  allUnits: "Tous les logements",
  guest: "locataire",
  guests: "locataires",
  guestsTitle: "Locataires",
  departure: "Fin de location",
  arrival: "Début",
  staysEmpty: "Aucune location en cours. Faites entrer un locataire depuis une réservation, ou créez une location directe.",
  reservationsEmpty: "Aucune réservation. Créez-en une pour réserver un logement.",
};

export function pageVocabulary(mode: ShellMode): PageVocabulary {
  // L'agence est suspendue : elle retombe sur le vocabulaire résidence, le plus proche.
  return mode === "HOTEL" ? HOTEL : RESIDENCE;
}
