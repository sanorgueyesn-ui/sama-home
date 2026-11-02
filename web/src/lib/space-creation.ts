// Socle multi-espaces, lot D — règles pures de création d'un espace professionnel supplémentaire.
// Aucun accès base ni réseau : testable seul (voir __tests__/space-creation.test.mts). L'action
// serveur (actions/space.ts) applique ces règles AVANT d'écrire, avec les données de la SESSION.

export const MAX_SPACES_PER_ACCOUNT = 3;
export const SPACE_NAME_MIN = 2;
export const SPACE_NAME_MAX = 80;

import { AGENCY_MODE_ENABLED, selectableBusinessModes } from "./business-mode";

/** Tous les modes qui existent (sert au type). Ceux qu'on peut réellement créer : voir `AGENCY_MODE_ENABLED`. */
export const CREATABLE_BUSINESS_MODES = ["HOTEL", "RESIDENCE", "REAL_ESTATE"] as const;
export type CreatableBusinessMode = (typeof CREATABLE_BUSINESS_MODES)[number];

export type SpaceCreationInput = { name: unknown; businessMode: unknown };
export type ParsedSpaceCreation =
  | { ok: true; name: string; businessMode: CreatableBusinessMode }
  | { ok: false; field: "name" | "businessMode"; message: string };

/**
 * Valide les champs du formulaire (venus du navigateur) : nom borné, mode dans la liste blanche. Tant
 * que le mode Agence est suspendu, il est refusé ici, côté serveur : masquer le choix dans le
 * formulaire ne suffirait pas. `agencyEnabled` ne sert qu'aux tests.
 */
export function parseSpaceCreation(input: SpaceCreationInput, agencyEnabled: boolean = AGENCY_MODE_ENABLED): ParsedSpaceCreation {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < SPACE_NAME_MIN || name.length > SPACE_NAME_MAX) {
    return {
      ok: false,
      field: "name",
      message: `Le nom doit contenir entre ${SPACE_NAME_MIN} et ${SPACE_NAME_MAX} caractères.`,
    };
  }
  const allowed = selectableBusinessModes(agencyEnabled);
  const mode = CREATABLE_BUSINESS_MODES.find((candidate) => candidate === input.businessMode && allowed.includes(candidate));
  if (!mode) {
    const suspended = input.businessMode === "REAL_ESTATE" && !agencyEnabled;
    return {
      ok: false,
      field: "businessMode",
      message: suspended ? "Les agences immobilières ne sont pas disponibles pour le moment." : "Choisissez un type d'activité.",
    };
  }
  return { ok: true, name, businessMode: mode };
}

export type SpaceCreationCheck = { allowed: true } | { allowed: false; message: string };

/**
 * Droits de création : réservé à l'administrateur d'un espace ACTIF (jamais au compte de
 * plateforme, qui n'a pas d'espace), et plafonné par compte pour empêcher la multiplication
 * d'essais gratuits. `currentSpaceCount` = appartenances RÉELLES du compte, relues en base.
 */
export function canCreateSpace(args: {
  isPlatformAdmin: boolean;
  role: string | null;
  currentSpaceCount: number;
}): SpaceCreationCheck {
  if (args.isPlatformAdmin || args.role !== "ADMIN") {
    return { allowed: false, message: "Seul l'administrateur d'un espace peut en ajouter un." };
  }
  if (args.currentSpaceCount >= MAX_SPACES_PER_ACCOUNT) {
    return {
      allowed: false,
      message: `Un compte peut avoir au plus ${MAX_SPACES_PER_ACCOUNT} espaces professionnels. Contactez-nous pour en ajouter davantage.`,
    };
  }
  return { allowed: true };
}
