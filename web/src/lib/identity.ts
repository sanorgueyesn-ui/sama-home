/**
 * Audit Client/Réservation — Bloc 3/4 : une pièce d'identité devient
 * nécessaire à partir d'un séjour de 2 jours OU PLUS, calculé sur la durée
 * RÉELLE (l'instant de départ moins l'instant d'arrivée, via
 * computeDepartureTime — déjà le mécanisme validé en Phase 6), jamais sur le
 * libellé affiché à l'utilisateur ni sur l'unité du tarif (HOURS/NIGHT/DAY/
 * WEEK/MONTH) — un tarif "NUIT" de 48h ou une "SEMAINE" déclenchent la règle
 * exactement comme un tarif "HEURE" cumulant 48h.
 */
export const IDENTITY_REQUIRED_THRESHOLD_HOURS = 48;

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
 * - Séjour < 48h → jamais requis (client lui-même facultatif, voir lot
 *   "Reservation — Client facultatif" — ni client ni identité exigés).
 * - Séjour ≥ 48h ET aucun client → refusé : un client est obligatoire avant
 *   même de pouvoir parler d'identité.
 * - Séjour ≥ 48h ET le client a déjà une identité en dossier → ne jamais la
 *   redemander, ne jamais l'écraser (même si des valeurs sont soumises).
 * - Séjour ≥ 48h ET le client n'a PAS d'identité en dossier → les valeurs
 *   soumises (type + numéro) deviennent obligatoires ; si présentes, elles
 *   seront enregistrées sur le client dans la MÊME transaction que la
 *   réservation/location (atomicité — voir actions/reservations.ts et
 *   actions/rentals.ts).
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
    return { ok: false, message: "Le client est obligatoire pour un séjour de 48 h ou plus." };
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
    message: "Pièce d'identité requise pour ce séjour (2 jours ou plus) : indiquez le type et le numéro de pièce.",
  };
}
