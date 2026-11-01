// Socle multi-espaces — contrôle du statut des espaces À LA CONNEXION. Module pur (testé seul).
//
// À ce moment il n'y a pas encore de session, donc pas d'espace actif : on regarde TOUS les
// espaces du compte (appartenances). La connexion n'est refusée que si AUCUN espace n'est
// utilisable ; sinon le compte entre, et `requireActiveEstablishment` (dal.ts) bloque ensuite
// chaque action sur un espace non actif. Avec un seul espace, le comportement est celui d'avant.

export type SpaceStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

/** Statut qui bloque la connexion, ou `null` si elle est permise. */
export function blockingStatus(statuses: readonly SpaceStatus[]): Exclude<SpaceStatus, "ACTIVE"> | null {
  if (statuses.length === 0 || statuses.includes("ACTIVE")) return null;
  // Ordre de priorité du message : en attente > refusé > suspendu.
  if (statuses.includes("PENDING")) return "PENDING";
  if (statuses.includes("REJECTED")) return "REJECTED";
  return "SUSPENDED";
}
