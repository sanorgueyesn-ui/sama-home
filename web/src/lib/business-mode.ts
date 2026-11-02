// Mode métier d'un espace (Hôtel, Résidence, Agence) — module pur, sans dépendance serveur,
// importable aussi depuis un composant client. Les valeurs reprennent l'enum Prisma
// `BusinessMode` (prisma/schema.prisma) sans importer le client généré.

/**
 * Le mode Agence immobilière est SUSPENDU : on se concentre sur les hôtels et les résidences. Rien
 * n'est supprimé (code, données, migrations, tableau de bord de l'agence). Cet interrupteur unique
 * retire le choix de l'inscription et de la création d'un espace, et le serveur refuse toute demande
 * forgée. Le remettre à `true` rétablit tout, sans autre changement.
 */
export const AGENCY_MODE_ENABLED = false;

export type BusinessModeValue = "HOTEL" | "RESIDENCE" | "REAL_ESTATE";

export const BUSINESS_MODE_LABELS: Record<BusinessModeValue, string> = {
  HOTEL: "Hôtel",
  RESIDENCE: "Résidence",
  REAL_ESTATE: "Agence immobilière",
};

/** Mode de la coquille (navigation) : `AGENCY` est le nom historique du mode Agence côté interface. */
export type ShellMode = "HOTEL" | "RESIDENCE" | "AGENCY";

export function toShellMode(mode: BusinessModeValue): ShellMode {
  return mode === "REAL_ESTATE" ? "AGENCY" : mode;
}

/** Inverse de `toShellMode` : le choix de l'inscription (« AGENCY ») vers le mode stocké. */
export function fromShellMode(mode: ShellMode): BusinessModeValue {
  return mode === "AGENCY" ? "REAL_ESTATE" : mode;
}

/**
 * Modes proposables aujourd'hui (inscription, nouvel espace, aperçu des tableaux de bord). Le
 * paramètre ne sert qu'aux tests : partout ailleurs, la valeur de l'interrupteur s'applique.
 */
export function selectableShellModes(agencyEnabled: boolean = AGENCY_MODE_ENABLED): ShellMode[] {
  return agencyEnabled ? ["RESIDENCE", "HOTEL", "AGENCY"] : ["RESIDENCE", "HOTEL"];
}

export function selectableBusinessModes(agencyEnabled: boolean = AGENCY_MODE_ENABLED): BusinessModeValue[] {
  return agencyEnabled ? ["HOTEL", "RESIDENCE", "REAL_ESTATE"] : ["HOTEL", "RESIDENCE"];
}

/** Espace tel que le voit l'interface (sélecteur) : uniquement des valeurs sérialisables. */
export type SpaceOption = {
  id: string;
  name: string;
  businessMode: BusinessModeValue;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
};

export const SPACE_STATUS_LABELS: Record<SpaceOption["status"], string> = {
  ACTIVE: "Actif",
  PENDING: "En attente d'approbation",
  REJECTED: "Demande refusée",
  SUSPENDED: "Suspendu",
};
