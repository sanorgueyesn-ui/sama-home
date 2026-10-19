/**
 * Audit Client/Réservation — Règle des séjours longs (10 jours ou plus) :
 * Une pièce d'identité (CNI, Passeport, Permis de conduire) devient obligatoire
 * à partir d'un séjour de 10 jours OU PLUS (240 heures réelles), calculé sur
 * la durée RÉELLE entre l'arrivée et le départ prévu.
 * Pour les séjours de moins de 10 jours, l'enregistrement reste ultra-rapide
 * (seuls le nom et le téléphone sont requis).
 */
export const IDENTITY_REQUIRED_THRESHOLD_HOURS = 240; // 10 jours * 24h = 240h

export function requiresIdentity(arrivalTime: Date, departureTime: Date): boolean {
  return departureTime.getTime() - arrivalTime.getTime() >= IDENTITY_REQUIRED_THRESHOLD_HOURS * 3600_000;
}

type ClientIdentity = { idDocumentType: string | null; idDocumentNumber: string | null };
type SubmittedIdentity = { idDocumentType?: string; idDocumentNumber?: string };

export type IdentityCheckResult =
  | { ok: true; updateClientWith: { idDocumentType: string; idDocumentNumber: string } | null }
  | { ok: false; message: string };

/**
 * Règle exacte validée :
 * - Séjour < 10 jours (240h) → identité facultative (nom + téléphone suffisent pour check-in rapide).
 * - Séjour ≥ 10 jours ET aucun client → refusé : un client avec identité est obligatoire.
 * - Séjour ≥ 10 jours ET le client a déjà une identité en dossier → ne jamais la redemander.
 * - Séjour ≥ 10 jours ET le client n'a PAS d'identité en dossier → les valeurs
 *   soumises (type + numéro) deviennent obligatoires pour la sécurité et la génération du contrat PDF.
 */
export function checkIdentityRequirement(
  arrivalTime: Date,
  departureTime: Date,
  client: ClientIdentity | null,
  submitted: SubmittedIdentity,
): IdentityCheckResult {
  if (!requiresIdentity(arrivalTime, departureTime)) {
    return { ok: true, updateClientWith: null };
  }
  if (!client) {
    return { ok: false, message: "Le client est obligatoire pour un séjour de plus de 10 jours." };
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
    message: "Pièce d'identité obligatoire pour ce long séjour (plus de 10 jours) : indiquez le type (CNI, passeport, permis de conduire) et le numéro de pièce.",
  };
}
