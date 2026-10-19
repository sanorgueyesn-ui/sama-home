/**
 * Audit Client/Réservation — Règle des séjours longs (10 jours ou plus) :
 * Une pièce d'identité (CNI, Passeport, Permis de conduire) devient obligatoire
 * à partir d'un séjour de 10 jours OU PLUS (240 heures réelles), calculé sur
 * la durée RÉELLE entre l'arrivée et le départ prévu.
 * Pour les séjours de moins de 10 jours, l'enregistrement reste ultra-rapide
 * (seuls le nom et le téléphone sont requis).
 */
export const IDENTITY_REQUIRED_THRESHOLD_HOURS = 24; // 1 jour par défaut pour les séjours journaliers avec contrat

export function requiresIdentity(
  arrivalTime: Date,
  departureTime: Date,
  thresholdHours: number = IDENTITY_REQUIRED_THRESHOLD_HOURS,
): boolean {
  return departureTime.getTime() - arrivalTime.getTime() >= thresholdHours * 3600_000;
}

type ClientIdentity = { idDocumentType: string | null; idDocumentNumber: string | null };
type SubmittedIdentity = { idDocumentType?: string | null; idDocumentNumber?: string | null };

export type IdentityCheckResult =
  | { ok: true; updateClientWith: { idDocumentType: string; idDocumentNumber: string } | null }
  | { ok: false; message: string };

/**
 * Règle validée :
 * - Séjour < seuil (ex: par heure / passage) → identité facultative (nom + téléphone suffisent pour check-in rapide).
 * - Séjour ≥ seuil (ex: par jour avec contrat) ET aucun client → refusé : un client avec identité est obligatoire.
 * - Séjour ≥ seuil ET le client a déjà une identité en dossier → ne jamais la redemander.
 * - Séjour ≥ seuil ET le client n'a PAS d'identité en dossier → les valeurs
 *   soumises (type + numéro) deviennent obligatoires pour la sécurité et la génération du contrat de bail PDF.
 */
export function checkIdentityRequirement(
  arrivalTime: Date,
  departureTime: Date,
  client: ClientIdentity | null,
  submitted: SubmittedIdentity,
  thresholdHours: number = IDENTITY_REQUIRED_THRESHOLD_HOURS,
): IdentityCheckResult {
  if (!requiresIdentity(arrivalTime, departureTime, thresholdHours)) {
    return { ok: true, updateClientWith: null };
  }
  if (!client) {
    return { ok: false, message: "Le client est obligatoire pour ce séjour avec contrat de location." };
  }
  if (client.idDocumentType && client.idDocumentNumber) {
    return { ok: true, updateClientWith: null };
  }
  if (submitted.idDocumentType && submitted.idDocumentNumber) {
    return {
      ok: true,
      updateClientWith: { idDocumentType: submitted.idDocumentType, idDocumentNumber: submitted.idDocumentNumber },
    };
  }
  return {
    ok: false,
    message: "Pièce d'identité obligatoire pour ce séjour avec contrat : indiquez le type (CNI, passeport, permis de conduire) et le numéro de pièce.",
  };
}
