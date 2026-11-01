// Messages en ARABE — SQUELETTE : la traduction n'est PAS commencée.
// Tant que cet objet est vide, l'interface affiche le français (repli, voir index.ts), avec la
// mise en page de droite à gauche si la langue est choisie (aperçu hors production seulement).
// Statut de la langue dans config.ts : « preparing » (non sélectionnable en production).
// Avant de passer en « ready » : traduction complète, relecture par une personne arabophone,
// police arabe vérifiée, contrôle visuel de toutes les pages.
import type { DeepPartial, Messages } from "./index";

export const ar: DeepPartial<Messages> = {};
