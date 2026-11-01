// Mode métier d'un espace (Hôtel, Résidence, Agence) — module pur, sans dépendance serveur,
// importable aussi depuis un composant client. Les valeurs reprennent l'enum Prisma
// `BusinessMode` (prisma/schema.prisma) sans importer le client généré.

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
