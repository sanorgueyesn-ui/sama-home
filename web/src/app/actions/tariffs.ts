"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
import {
  TariffSchema,
  type TariffFormState,
  type TARIFF_TYPE_VALUES,
  type DURATION_UNIT_VALUES,
} from "@/lib/definitions";

type TariffTypeValue = (typeof TARIFF_TYPE_VALUES)[number];
type DurationUnitValue = (typeof DURATION_UNIT_VALUES)[number];

function parseTariffForm(formData: FormData, active: boolean) {
  return TariffSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    durationValue: formData.get("durationValue"),
    durationUnit: formData.get("durationUnit"),
    amount: formData.get("amount"),
    active,
  });
}

const DUPLICATE_MESSAGE =
  "Un tarif actif existe déjà pour ce type et cette durée sur ce logement. Désactivez-le d'abord, ou modifiez celui-ci plutôt que d'en créer un nouveau.";

class TariffActionError extends Error {}

// Phase 3G / Lot D12-P49 — `client` ajouté en DERNIÈRE position, optionnel,
// par défaut le client `prisma` module-level déjà utilisé auparavant : les
// appels existants dans updateTariff()/toggleTariffActive() (non modifiés
// dans ce lot) continuent de fonctionner à l'identique, sans aucun
// changement de comportement. Seul createTariff() passe désormais `tx`
// explicitement, pour que ce contrôle fasse réellement partie de la même
// transaction Serializable que la création — condition nécessaire pour que
// PostgreSQL puisse détecter un conflit d'écriture concurrente entre les
// deux (une requête hors transaction, sur une connexion séparée, ne
// participerait pas à cette détection).
async function hasConflictingActiveTariff(
  propertyId: string,
  data: { type: TariffTypeValue; durationValue: number; durationUnit: DurationUnitValue },
  excludeId?: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const conflict = await client.tariff.findFirst({
    where: {
      propertyId,
      type: data.type,
      durationValue: data.durationValue,
      durationUnit: data.durationUnit,
      active: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return Boolean(conflict);
}

export async function createTariff(
  propertyId: string,
  _prevState: TariffFormState,
  formData: FormData,
): Promise<TariffFormState> {
  // Phase 3G / Lot D12-P51 — faille confirmée en D12-P50 : un tarif neuf
  // démarre toujours `active: true` (voir plus bas), ce qui équivaut
  // fonctionnellement à une activation — déjà soumise au garde dans
  // toggleTariffActive() (D12-O9) mais absente ici jusqu'à présent. Même
  // emplacement et même pattern exhaustif que updateTariff()/
  // toggleTariffActive()/deleteTariff() : en tout premier, avant toute
  // lecture du logement, toute validation et toute écriture. Message
  // "NO_ESTABLISHMENT" conservé à l'identique (comportement inchangé pour ce
  // cas précis) ; les trois autres repris mot pour mot des fonctions
  // voisines du même fichier, jamais reformulés.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un tarif." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // Phase 3D / Lot D8 — le logement cible doit appartenir au même
  // établissement avant d'y rattacher un nouveau tarif ; un logement d'un
  // autre établissement est désormais indistinguable d'un id inexistant.
  const property = await prisma.property.findFirst({
    where: { id: propertyId, establishmentId: user.establishmentId },
  });
  if (!property) {
    return { message: "Logement introuvable." };
  }

  // New tariffs start active — no toggle rendered on the create form.
  const parsed = parseTariffForm(formData, true);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Phase 3G / Lot D12-P49 — faille confirmée en D12-P48 : le contrôle de
  // doublon et la création n'étaient pas enveloppés dans une transaction,
  // contrairement à createExpenseCategory() (même type de risque). Aucune
  // contrainte d'unicité n'existe sur `Tariff` pour (propertyId, type,
  // durationValue, durationUnit) — vérifié dans le schéma réel avant ce
  // lot, aucun filet de sécurité au niveau base — la protection repose donc
  // entièrement sur l'isolation Serializable ci-dessous, seule disponible
  // sans migration. Établissement déjà résolu et vérifié plus haut
  // (`user.establishmentId`, `property`), inchangé.
  try {
    await prisma.$transaction(
      async (tx) => {
        if (await hasConflictingActiveTariff(propertyId, parsed.data, undefined, tx)) {
          throw new TariffActionError(DUPLICATE_MESSAGE);
        }
        await tx.tariff.create({ data: { ...parsed.data, propertyId, establishmentId: user.establishmentId } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof TariffActionError) {
      return { message: error.message };
    }
    // P2034 = conflit d'écriture/sérialisation Postgres sous isolation
    // Serializable — jamais confondu avec P2002 (violation d'une contrainte
    // d'unicité, qui n'existe d'ailleurs pas ici). Toute AUTRE erreur reste
    // journalisée comme inattendue, jamais masquée, jamais présentée comme
    // un succès.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return {
        message:
          "Un tarif identique vient peut-être d'être créé à l'instant par quelqu'un d'autre. Veuillez vérifier et réessayer.",
      };
    }
    console.error(`createTariff(propertyId=${propertyId}) — échec inattendu de la création du tarif :`, error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath(`/logements/${propertyId}`);
  redirect(`/logements/${propertyId}?tariffCreated=1`);
}

export async function updateTariff(
  tariffId: string,
  _prevState: TariffFormState,
  formData: FormData,
): Promise<TariffFormState> {
  // Phase 3G / Lot D12-O7 — requireActiveEstablishment() placé en tout
  // premier, avant la lecture de `existing`, toute validation et toute
  // écriture. Remplace l'ancien contrôle `!user.establishmentId` seul :
  // couvre désormais aussi le statut de l'établissement et celui de
  // l'abonnement, strictement séparés (voir dal.ts).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce tarif." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // Un tarif d'un autre établissement est indistinguable d'un id inexistant.
  const existing = await prisma.tariff.findFirst({ where: { id: tariffId, establishmentId: user.establishmentId } });
  if (!existing) {
    return { message: "Tarif introuvable." };
  }

  const parsed = parseTariffForm(formData, formData.get("active") === "on");
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // hasConflictingActiveTariff() interrogée avec `existing.propertyId` —
  // déjà garanti appartenir au même établissement puisque `existing` vient
  // de la recherche filtrée ci-dessus (un `propertyId` ne peut référencer
  // qu'un seul logement, donc un seul établissement) : aucun filtre
  // supplémentaire nécessaire sur cet appel partagé avec createTariff().
  if (
    parsed.data.active &&
    (await hasConflictingActiveTariff(existing.propertyId, parsed.data, tariffId))
  ) {
    return { message: DUPLICATE_MESSAGE };
  }

  let result: { count: number };
  try {
    result = await prisma.tariff.updateMany({
      where: { id: tariffId, establishmentId: user.establishmentId },
      data: parsed.data,
    });
  } catch (error) {
    console.error(`updateTariff(${tariffId}) — échec inattendu de la mise à jour du tarif :`, error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }
  if (result.count === 0) {
    return { message: "Tarif introuvable." };
  }

  revalidatePath(`/logements/${existing.propertyId}`);
  redirect(`/logements/${existing.propertyId}?tariffUpdated=1`);
}

/**
 * Deactivation is always safe (never conflicts). Reactivation can conflict
 * with another active tariff for the same type+duration — reported back as
 * `{ error }` rather than thrown, so the quick-toggle button can show it
 * inline without a full error-boundary crash for what is a normal,
 * expected validation case.
 */
export async function toggleTariffActive(
  id: string,
  nextActive: boolean,
): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-O9 — requireActiveEstablishment() placé en tout
  // premier pour la réactivation, avant la lecture de `existing`, toute
  // vérification de conflit et toute écriture. Retour mappé en `{ error }`
  // (pas `{ message }`) pour rester compatible avec le type de retour
  // existant et son appelant UI (tariff-row-actions.tsx), qui affiche bien
  // `result.error` (confirmé par lecture directe du composant).
  //
  // Phase 3G / Lot D12-P53 — sur-blocage confirmé en D12-P50 : le garde
  // s'appliquait jusqu'ici inconditionnellement, bloquant donc aussi la
  // DÉSACTIVATION d'un tarif pour un établissement inactif/sans
  // abonnement/expiré — alors que désactiver réduit le risque commercial et
  // ne touche aucune réservation/location existante (même principe que
  // cancelReservation/cancelRental/toggleActive des logements, D12-P52). Le
  // garde ne s'applique donc plus qu'à `nextActive === true` ; la
  // désactivation conserve uniquement l'authentification et la résolution
  // serveur de `establishmentId`, jamais fournie par le client.
  let establishmentId: string;

  if (nextActive) {
    const access = await requireActiveEstablishment();
    if (!access.ok) {
      switch (access.reason) {
        case "NO_ESTABLISHMENT":
          return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce tarif." };
        case "INACTIVE":
          return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
        case "NO_SUBSCRIPTION":
          return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
        case "EXPIRED":
          return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
      }
    }
    // Narrowing explicite requis par le compilateur — même raison et même
    // style que dans updateTariff()/updateProperty() : `establishmentId`
    // reste typé `string | null` ici bien que requireActiveEstablishment()
    // garantisse déjà cette valeur non nulle en pratique (NO_ESTABLISHMENT
    // exclu ci-dessus). Message repris à l'identique de la branche
    // NO_ESTABLISHMENT ci-dessus, aucune formulation nouvelle.
    if (!access.user.establishmentId) {
      return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce tarif." };
    }
    establishmentId = access.user.establishmentId;
  } else {
    const user = await getCurrentUser();
    if (!user.establishmentId) {
      return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce tarif." };
    }
    establishmentId = user.establishmentId;
  }

  // Phase 14 audit (Bloc 7): findUniqueOrThrow with no guard here would
  // throw uncaught for a nonexistent/tampered id instead of the same
  // graceful "introuvable" pattern every other action in this file (and the
  // rest of the project) already uses. Phase 3D / Lot D3 — un tarif d'un
  // autre établissement suit désormais exactement ce même chemin.
  const existing = await prisma.tariff.findFirst({ where: { id, establishmentId } });
  if (!existing) {
    return { error: "Tarif introuvable." };
  }

  if (nextActive && (await hasConflictingActiveTariff(existing.propertyId, existing, id))) {
    return { error: DUPLICATE_MESSAGE };
  }

  const result = await prisma.tariff.updateMany({
    where: { id, establishmentId },
    data: { active: nextActive },
  });
  if (result.count === 0) {
    return { error: "Tarif introuvable." };
  }
  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}

/**
 * Phase 6, Bloc 14: now that Reservation -> Tariff exists, a tariff
 * referenced by any reservation (of any status, including CANCELLED — the
 * historical record must still be able to display what it booked) can never
 * be physically deleted. Deactivation remains the safe, always-available
 * alternative, which the UI leads with.
 *
 * Phase 7 update: Rental -> Tariff now exists too (`onDelete: Restrict` in
 * the schema would otherwise let a Rental-referenced tariff pass this
 * application check and then fail with a raw Prisma foreign-key error
 * instead of this friendly message) — same rule, extended to Rental.
 */
export async function deleteTariff(id: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-O11 — requireActiveEstablishment() placé en tout
  // premier, avant la lecture de `existing`, les vérifications de référence
  // et toute suppression. Remplace l'ancien contrôle `!user.establishmentId`
  // seul : couvre désormais aussi le statut de l'établissement et celui de
  // l'abonnement, strictement séparés (voir dal.ts). Retour mappé en
  // `{ error }` (pas `{ message }`) pour rester compatible avec le type de
  // retour existant et son appelant UI (tariff-row-actions.tsx).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de supprimer ce tarif." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // Phase 14 audit (Bloc 7): same fix as toggleTariffActive above.
  // Phase 3D / Lot D3 — un tarif d'un autre établissement suit désormais ce
  // même chemin "introuvable".
  const existing = await prisma.tariff.findFirst({ where: { id, establishmentId: user.establishmentId } });
  if (!existing) {
    return { error: "Tarif introuvable." };
  }

  // Phase 3D / Lot D3, règle 8 — vérifications de référence limitées aux
  // données du même établissement (cohérent avec `existing`, jamais une
  // réservation/location d'un autre établissement ne peut de toute façon
  // référencer ce `tariffId` précis, mais le filtre explicite est demandé
  // et ajouté ici par défense en profondeur).
  const [referencingReservation, referencingRental] = await Promise.all([
    prisma.reservation.findFirst({
      where: { tariffId: id, establishmentId: user.establishmentId },
      select: { id: true },
    }),
    prisma.rental.findFirst({
      where: { tariffId: id, establishmentId: user.establishmentId },
      select: { id: true },
    }),
  ]);
  if (referencingReservation || referencingRental) {
    return {
      error:
        "Ce tarif est référencé par au moins une réservation ou une location et ne peut pas être supprimé. Désactivez-le à la place.",
    };
  }

  // `deleteMany` (pas `delete`, qui n'accepte que la clé unique) : supprime
  // uniquement si l'établissement correspond toujours au moment de
  // l'écriture — jamais la donnée d'un autre établissement.
  const result = await prisma.tariff.deleteMany({ where: { id, establishmentId: user.establishmentId } });
  if (result.count === 0) {
    return { error: "Tarif introuvable." };
  }

  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}
