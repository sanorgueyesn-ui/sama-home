import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Statut fonctionnel d'un logement — JAMAIS stocké en base (voir le
 * commentaire sur `model Property` dans schema.prisma). Calculé à chaque
 * lecture pour ne jamais pouvoir contredire une réservation/location réelle.
 *
 * Phase 7 : devient async et interroge la base (Reservation + Rental), ce
 * qui change la signature de `computePropertyStatus` posée en Phase 4 —
 * modification nécessaire et documentée (Bloc 18/19 l'exigent
 * explicitement), tous les appelants (liste et détail Logements) sont mis à
 * jour dans le même commit.
 */
export type PropertyStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE";

/**
 * Fenêtre pendant laquelle une réservation CONFIRMED à venir marque le
 * logement RESERVED "maintenant". FLAGGED ASSUMPTION (voir le rapport final
 * de la Phase 7) : le prompt maître interdit explicitement de marquer
 * RESERVED à cause d'une réservation "à une date très éloignée" mais ne
 * donne aucun seuil chiffré. 24h est un jugement, pas une spécification —
 * à confirmer ou ajuster.
 */
export const RESERVATION_HORIZON_HOURS = 24;

// Reconstruction UI — couleurs exprimées via les tokens CSS sémantiques
// (var(--color-success) etc., voir globals.css) plutôt qu'en hex figé, pour
// que ces badges suivent automatiquement le thème clair/sombre actif. Pure
// présentation : les 4 statuts eux-mêmes et la logique ci-dessus (Bloc 19)
// sont inchangés.
export const PROPERTY_STATUS_META: Record<
  PropertyStatus,
  { label: string; color: string; bg: string }
> = {
  AVAILABLE: { label: "Disponible", color: "var(--color-success)", bg: "var(--color-success-bg)" },
  OCCUPIED: { label: "Occupé", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  RESERVED: { label: "Réservé", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  UNAVAILABLE: { label: "Indisponible", color: "var(--color-neutral)", bg: "var(--color-neutral-bg)" },
};

/**
 * Version batch : UNE requête pour N logements plutôt qu'une requête par
 * ligne (évite le N+1 sur la liste /logements). Priorité fixe (Bloc 19) :
 * UNAVAILABLE (property.active === false) > OCCUPIED (une Rental ACTIVE) >
 * RESERVED (une Reservation CONFIRMED dont l'intervalle chevauche
 * [now, now + RESERVATION_HORIZON_HOURS)) > AVAILABLE.
 */
export async function getPropertyStatuses(
  properties: { id: string; active: boolean }[],
  now: Date = new Date(),
): Promise<Map<string, PropertyStatus>> {
  const ids = properties.map((p) => p.id);
  const horizonEnd = new Date(now.getTime() + RESERVATION_HORIZON_HOURS * 60 * 60 * 1000);

  const [activeRentals, nearReservations] = ids.length
    ? await Promise.all([
        prisma.rental.findMany({
          where: { propertyId: { in: ids }, status: "ACTIVE" },
          select: { propertyId: true },
        }),
        prisma.reservation.findMany({
          where: {
            propertyId: { in: ids },
            status: "CONFIRMED",
            departureTime: { gt: now },
            arrivalTime: { lt: horizonEnd },
          },
          select: { propertyId: true },
        }),
      ])
    : [[], []];

  const occupiedIds = new Set(activeRentals.map((r) => r.propertyId));
  const reservedIds = new Set(nearReservations.map((r) => r.propertyId));

  const result = new Map<string, PropertyStatus>();
  for (const property of properties) {
    if (!property.active) {
      result.set(property.id, "UNAVAILABLE");
    } else if (occupiedIds.has(property.id)) {
      result.set(property.id, "OCCUPIED");
    } else if (reservedIds.has(property.id)) {
      result.set(property.id, "RESERVED");
    } else {
      result.set(property.id, "AVAILABLE");
    }
  }
  return result;
}

/** Wrapper à un seul logement, construit sur la version batch ci-dessus. */
export async function getPropertyStatus(
  property: { id: string; active: boolean },
  now: Date = new Date(),
): Promise<PropertyStatus> {
  const map = await getPropertyStatuses([property], now);
  return map.get(property.id) ?? "UNAVAILABLE";
}
