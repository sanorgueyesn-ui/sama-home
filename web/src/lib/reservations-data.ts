import "server-only";
import type { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { resolveImageDisplayUrl } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";

const LIST_LIMIT = 50;

export type ReservationTimeFilter = "today" | "upcoming" | "past" | "cancelled" | "all";

/**
 * For the "Nouvelle réservation" form: only active properties (Bloc 17:
 * "logement actif"), each with only its active tariffs (Bloc 10). A property
 * with zero active tariffs is still included — the form must show "Aucun
 * tarif actif pour ce logement." per Bloc 10, not hide the property.
 */
export async function listActivePropertiesWithActiveTariffs() {
  // Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  const properties = await prisma.property.findMany({
    where: { active: true, establishmentId: user.establishmentId },
    select: {
      id: true,
      name: true,
      type: true,
      // Reconstruction UI (Séjour, Lot 2 correctif) — `photo` ajouté pour la
      // grille de cartes desktop (photo réelle si elle existe, sinon le repli
      // existant PropertyPhoto) ; champ déjà sur `Property`, ajout d'un
      // simple `select`, aucun changement de comportement pour les appelants
      // existants (reservation-form.tsx) qui l'ignorent simplement.
      photo: true,
      tariffs: {
        where: { active: true },
        select: { id: true, label: true, type: true, durationValue: true, durationUnit: true, amount: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  // Lot "Téléversement durable des images" — même résolution clé->URL
  // d'affichage que src/lib/properties-data.ts (voir ce fichier pour le
  // détail des deux formats de valeur stockée coexistant en base). Le
  // client S3 n'est obtenu que pour les logements ayant réellement une
  // photo (même garde que withResolvedPhoto, properties-data.ts).
  return Promise.all(
    properties.map(async (property) => {
      if (!property.photo) return property;
      return { ...property, photo: await resolveImageDisplayUrl(getS3Client(), getBucketName(), property.photo) };
    }),
  );
}

export async function listReservations(filters: {
  timeFilter?: ReservationTimeFilter;
  propertyId?: string;
  /** AT-7 — historique d'un locataire (clients/[id]/page.tsx). Un `clientId`
   * spécifique ne peut structurellement jamais matcher une réservation
   * `clientId = null` (séjour court sans client) — exclusion automatique,
   * aucune logique supplémentaire nécessaire. */
  clientId?: string;
  status?: ReservationStatus;
  query?: string;
}) {
  // Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { items: [], total: 0, truncated: false };
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const timeFilter = filters.timeFilter ?? "upcoming";
  const trimmedQuery = filters.query?.trim();

  const where = {
    establishmentId: user.establishmentId,
    ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(timeFilter === "today" ? { date: { gte: startOfToday, lt: endOfToday } } : {}),
    ...(timeFilter === "upcoming"
      ? { arrivalTime: { gte: now }, status: { not: "CANCELLED" as ReservationStatus } }
      : {}),
    ...(timeFilter === "past"
      ? { departureTime: { lt: now }, status: { not: "CANCELLED" as ReservationStatus } }
      : {}),
    ...(timeFilter === "cancelled" ? { status: "CANCELLED" as ReservationStatus } : {}),
    ...(trimmedQuery
      ? {
          client: {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" as const } },
              { phone: { contains: trimmedQuery.replace(/[\s.-]/g, ""), mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: { arrivalTime: timeFilter === "past" ? "desc" : "asc" },
      take: LIST_LIMIT,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

/** Phase 3C / Lot C2 — une réservation d'un autre établissement est traitée comme introuvable. */
export async function getReservationById(id: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  return prisma.reservation.findFirst({
    where: { id, establishmentId: user.establishmentId },
    include: {
      client: true,
      property: { select: { id: true, name: true, type: true, active: true } },
      tariff: { select: { id: true, label: true, type: true } },
    },
  });
}
