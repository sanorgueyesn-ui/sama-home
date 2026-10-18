import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import type { PROPERTY_TYPE_VALUES } from "@/lib/definitions";
import { resolveImageDisplayUrl } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";

const LIST_LIMIT = 50;

type PropertyTypeFilter = (typeof PROPERTY_TYPE_VALUES)[number] | undefined;

/**
 * Lot "Téléversement durable des images" — `photo` est désormais soit une
 * clé d'objet du Bucket Railway, soit (données historiques) un lien http(s)
 * collé directement. Résolu ICI, au point de lecture, en une URL
 * d'affichage prête à l'emploi (présignée si c'est une clé, inchangée si
 * c'est déjà un lien) : tous les appelants existants (pages logements,
 * tableau de bord, grille de séjour, PropertyPhoto…) continuent de lire
 * `property.photo` exactement comme avant, sans aucune modification.
 */
async function withResolvedPhoto<T extends { photo: string | null }>(property: T): Promise<T> {
  // Le client S3 n'est obtenu (et ses variables d'environnement vérifiées)
  // QUE si une photo existe réellement à résoudre — jamais pour un logement
  // sans photo, pour qu'une page n'ayant aucune photo à afficher ne dépende
  // jamais de la disponibilité du bucket.
  if (!property.photo) return property;
  const photo = await resolveImageDisplayUrl(getS3Client(), getBucketName(), property.photo);
  return { ...property, photo };
}

export async function listProperties(query?: string, type?: PropertyTypeFilter) {
  // Phase 3C / Lot C1 — getCurrentUser() (plutôt que verifySession() seul)
  // pour résoudre l'établissement de l'appelant ; getPropertyById() ci-dessous
  // reste inchangée (lecture par identifiant, hors périmètre de ce lot).
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    // Jamais les données de tous les établissements par défaut — résultat
    // vide plutôt qu'une erreur, conforme au contrat existant de la fonction
    // (une liste, jamais une redirection).
    return { items: [], total: 0, truncated: false };
  }

  const trimmed = query?.trim();
  const where = {
    establishmentId: user.establishmentId,
    ...(type ? { type } : {}),
    ...(trimmed ? { name: { contains: trimmed, mode: "insensitive" as const } } : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.property.findMany({ where, orderBy: { name: "asc" }, take: LIST_LIMIT }),
    prisma.property.count({ where }),
  ]);
  const items = await Promise.all(rawItems.map(withResolvedPhoto));

  return { items, total, truncated: total > items.length };
}

/**
 * Phase 3C / Lot C2 — `findFirst` (pas `findUnique`, qui n'accepte que la
 * clé unique dans son `where`) avec un filtre `establishmentId` explicite :
 * un logement d'un autre établissement doit être traité comme introuvable,
 * jamais renvoyé à l'appelant. Contrat inchangé pour les appelants existants
 * (toujours `Property | null`) — seul le cas "appartient à un autre
 * établissement" rejoint désormais le cas déjà existant "id inexistant".
 */
export async function getPropertyById(id: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  const property = await prisma.property.findFirst({ where: { id, establishmentId: user.establishmentId } });
  return property ? withResolvedPhoto(property) : null;
}

/** For the reservation list's "logement" filter dropdown (Phase 6, Bloc 15). */
export async function listAllPropertiesForSelect() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.property.findMany({
    where: { establishmentId: user.establishmentId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}
