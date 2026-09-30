/**
 * Statut fonctionnel d'un logement — JAMAIS stocké en base (voir le
 * commentaire sur `model Property` dans schema.prisma). Calculé à chaque
 * lecture pour ne jamais pouvoir contredire une réservation/location réelle.
 *
 * En Phase 4, seule la source `active` existe : un logement inactif est
 * UNAVAILABLE, un logement actif est réputé AVAILABLE. Les Phases 6 à 8
 * (Réservations, Disponibilité, Locations) étendront le paramètre de
 * `computePropertyStatus` avec les réservations/locations actives du
 * logement pour produire RESERVED / OCCUPIED — sans changer ce type ni la
 * façon dont les pages l'appellent.
 */
export type PropertyStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE";

export function computePropertyStatus(property: { active: boolean }): PropertyStatus {
  if (!property.active) return "UNAVAILABLE";
  return "AVAILABLE";
}

export const PROPERTY_STATUS_META: Record<
  PropertyStatus,
  { label: string; color: string; bg: string }
> = {
  AVAILABLE: { label: "Disponible", color: "#16A34A", bg: "#E8F5EC" },
  OCCUPIED: { label: "Occupé", color: "#E5484D", bg: "#FBEAEA" },
  RESERVED: { label: "Réservé", color: "#F59E0B", bg: "#FDF1DC" },
  UNAVAILABLE: { label: "Indisponible", color: "#52606D", bg: "#EBEDEE" },
};
