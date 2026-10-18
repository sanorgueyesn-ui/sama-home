"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { findAvailabilityConflict, type AvailabilityConflict } from "@/lib/availability";
import { checkIdentityRequirement, requiresIdentity } from "@/lib/identity";
import { ReservationClientOptionalSchema, type ReservationFormState } from "@/lib/definitions";

function parseReservationForm(formData: FormData) {
  return ReservationClientOptionalSchema.safeParse({
    clientId: formData.get("clientId"),
    propertyId: formData.get("propertyId"),
    tariffId: formData.get("tariffId"),
    date: formData.get("date"),
    arrivalTime: formData.get("arrivalTime"),
    deposit: formData.get("deposit"),
    depositMethod: formData.get("depositMethod"),
    note: formData.get("note"),
    idDocumentType: formData.get("idDocumentType") ?? undefined,
    idDocumentNumber: formData.get("idDocumentNumber") ?? undefined,
  });
}

class AvailabilityConflictError extends Error {}

// Phase 7, Bloc 7: a reservation must also be refused if it would overlap an
// active Rental (a walk-in currently occupying the room), not only another
// reservation — so this now goes through the shared findAvailabilityConflict
// instead of a reservation-only query.
function formatConflictMessage(conflict: AvailabilityConflict) {
  const fmt = (d: Date) =>
    d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const occupancyWord = conflict.kind === "rental" ? "est actuellement occupé par" : "occupe déjà ce logement du";
  if (conflict.kind === "rental") {
    return `Indisponible : ${conflict.clientName} ${occupancyWord} ${fmt(conflict.arrivalTime)} à ${fmt(conflict.departureTime)} (départ prévu).`;
  }
  return `Indisponible : ${conflict.clientName} ${occupancyWord} ${fmt(conflict.arrivalTime)} au ${fmt(conflict.departureTime)}.`;
}

/**
 * Read-only live check used by the form as the user picks date/heure/tarif
 * (Bloc 10/11 "afficher immédiatement" feedback). This is NOT the security
 * boundary — createReservation/updateReservation redo this same check
 * inside a Serializable transaction at submission time, which is the only
 * check that is actually trusted.
 */
export async function checkAvailability(input: {
  propertyId: string;
  tariffId: string;
  date: string;
  arrivalTime: string;
  excludeReservationId?: string;
}): Promise<{ available: boolean; message?: string; departureTime?: string }> {
  // Phase 3G / Lot D12-P13 — faille confirmée en D12-P12 : le tarif n'était
  // pas filtré par établissement, et `input.propertyId` est entièrement
  // fourni par l'appelant — un utilisateur authentifié pouvait interroger
  // la disponibilité réelle (nom de client inclus via formatConflictMessage)
  // d'un logement appartenant à un autre établissement. `getCurrentUser()`
  // remplace `verifySession()` pour disposer de `establishmentId` ; même
  // réponse `{ available: false }` pour un id absent ou étranger — jamais
  // révélé lequel. Filtrer le tarif suffit : un Tariff n'est créé que
  // rattaché à un logement du même établissement (invariant garanti à la
  // création, createTariff), donc une fois `tariff.propertyId ===
  // input.propertyId` confirmé, ce logement appartient lui aussi au bon
  // établissement.
  const user = await getCurrentUser();
  if (!user.establishmentId) return { available: false };

  if (!input.propertyId || !input.tariffId || !input.date || !input.arrivalTime) {
    return { available: false };
  }

  const tariff = await prisma.tariff.findFirst({
    where: { id: input.tariffId, establishmentId: user.establishmentId },
  });
  if (!tariff || tariff.propertyId !== input.propertyId) {
    return { available: false };
  }

  const arrivalDateTime = new Date(`${input.date}T${input.arrivalTime}:00`);
  if (Number.isNaN(arrivalDateTime.getTime())) {
    return { available: false };
  }
  const departureDateTime = computeDepartureTime(arrivalDateTime, tariff.durationValue, tariff.durationUnit);

  const conflict = await findAvailabilityConflict(prisma, {
    propertyId: input.propertyId,
    arrivalTime: arrivalDateTime,
    departureTime: departureDateTime,
    excludeReservationId: input.excludeReservationId,
  });

  return {
    available: !conflict,
    message: conflict ? formatConflictMessage(conflict) : undefined,
    departureTime: departureDateTime.toISOString(),
  };
}

export async function createReservation(
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  // Phase 3G / Lot D12-O13 — requireActiveEstablishment() placé en tout
  // premier, avant toute lecture métier (client/logement/tarif), avant le
  // contrôle d'identité et avant la transaction Serializable. Ne concerne
  // volontairement que la CRÉATION d'une nouvelle réservation (voir audit
  // D12-O12) : checkAvailability()/updateReservation()/cancelReservation()
  // gèrent des séjours déjà engagés et restent hors périmètre, inchangées.
  // Remplace l'ancien contrôle `!user.establishmentId` seul : couvre
  // désormais aussi le statut de l'établissement et celui de l'abonnement,
  // strictement séparés (voir dal.ts).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer une réservation." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { clientId, propertyId, tariffId, date, arrivalTime, deposit, depositMethod, note, idDocumentType, idDocumentNumber } = parsed.data;

  // Bloc 17 — every existence/coherence rule re-checked server-side.
  // Lot "Reservation — client facultatif" : clientId peut être absent
  // (séjour court) — ne tenter la recherche que s'il a été soumis.
  // Phase 3F / Lot D12-I — chaque lecture filtrée par `establishmentId` :
  // un client/logement/tarif d'un autre établissement suit désormais
  // exactement le même message "introuvable"/"désactivé" déjà existant
  // ci-dessous, jamais une création référençant une ressource extérieure.
  const [client, property, tariff] = await Promise.all([
    clientId
      ? prisma.client.findFirst({ where: { id: clientId, establishmentId: user.establishmentId } })
      : Promise.resolve(null),
    prisma.property.findFirst({ where: { id: propertyId, establishmentId: user.establishmentId } }),
    prisma.tariff.findFirst({ where: { id: tariffId, establishmentId: user.establishmentId } }),
  ]);
  if (clientId && !client) return { message: "Client introuvable." };
  if (!property) return { message: "Logement introuvable." };
  if (!property.active) return { message: "Ce logement est désactivé." };
  if (!tariff) return { message: "Tarif introuvable." };
  if (!tariff.active) return { message: "Ce tarif est désactivé." };
  if (tariff.propertyId !== propertyId) return { message: "Ce tarif n'appartient pas à ce logement." };

  const arrivalDateTime = new Date(`${date}T${arrivalTime}:00`);
  if (Number.isNaN(arrivalDateTime.getTime())) {
    return { message: "Date ou heure invalide." };
  }
  const departureDateTime = computeDepartureTime(arrivalDateTime, tariff.durationValue, tariff.durationUnit);

  // The amount is ALWAYS the tariff's current amount — never a client-
  // submitted value (Bloc 13 + Bloc 17: never trust the browser for money).
  const amount = tariff.amount;
  if (deposit > amount) {
    return { errors: { deposit: ["L'acompte ne peut pas dépasser le montant total."] } };
  }

  // Audit Client/Réservation, Bloc 3/4 — identité obligatoire côté serveur
  // à partir de 48h réelles, jamais uniquement côté interface. Calculé ici
  // (avant la transaction) pour pouvoir refuser immédiatement avec un
  // message clair ; la mise à jour du client, elle, reste dans la
  // transaction ci-dessous pour rester atomique avec la réservation.
  // Lot "Reservation — client facultatif" : checkIdentityRequirement refuse
  // désormais elle-même (même seuil de 48h) si client est null, avec le
  // message "Le client est obligatoire pour un séjour de 48 h ou plus." —
  // une seule fonction, un seul seuil, pour les deux règles liées.
  const identityCheck = checkIdentityRequirement(arrivalDateTime, departureDateTime, client, {
    idDocumentType,
    idDocumentNumber,
  });
  if (!identityCheck.ok) {
    return { message: identityCheck.message };
  }

  let reservationId: string;
  try {
    reservationId = await prisma.$transaction(
      async (tx) => {
        const conflict = await findAvailabilityConflict(tx, {
          propertyId,
          arrivalTime: arrivalDateTime,
          departureTime: departureDateTime,
        });
        if (conflict) {
          throw new AvailabilityConflictError(formatConflictMessage(conflict));
        }
        if (identityCheck.updateClientWith && client) {
          await tx.client.update({ where: { id: client.id }, data: identityCheck.updateClientWith });
        }
        const reservation = await tx.reservation.create({
          data: {
            clientId: client?.id ?? null,
            propertyId,
            tariffId,
            date: new Date(`${date}T00:00:00`),
            arrivalTime: arrivalDateTime,
            departureTime: departureDateTime,
            durationValue: tariff.durationValue,
            durationUnit: tariff.durationUnit,
            amount,
            deposit,
            depositMethod: depositMethod ?? null,
            note,
            establishmentId: user.establishmentId,
          },
        });
        // Phase 8, Bloc 1/5: the initial acompte is now ALSO represented as
        // a real Payment row, atomically with the reservation itself — this
        // is what makes it the single source of truth for totalPaid from
        // now on (see src/lib/payment-summary.ts), while `deposit` itself
        // stays untouched for historical readability (Bloc 2). No Payment is
        // created for deposit = 0 (nothing was actually collected).
        if (deposit > 0) {
          await tx.payment.create({
            data: {
              reservationId: reservation.id,
              amount: deposit,
              // depositMethod is optional on this form (deposit > 0 with no
              // method chosen is an existing, allowed case) — OTHER is the
              // honest "unspecified" fallback, never a guessed method.
              method: depositMethod ?? "OTHER",
              establishmentId: user.establishmentId,
            },
          });
        }
        return reservation.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof AvailabilityConflictError) {
      return { message: error.message };
    }
    // Bloc 11: Serializable can abort a transaction under real concurrent
    // writes even when the read above found nothing — that's Postgres
    // correctly detecting the race, not a bug. See the Phase 6 report for
    // the documented limits of this mechanism.
    return {
      message:
        "Le créneau vient peut-être d'être réservé à l'instant par quelqu'un d'autre. Veuillez vérifier la disponibilité et réessayer.",
    };
  }

  revalidatePath("/reservations");
  revalidatePath(`/logements/${propertyId}`);
  redirect(`/reservations/${reservationId}?created=1`);
}

export async function updateReservation(
  id: string,
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : updateReservation()
  // n'était gardée que par getCurrentUser(), jamais par
  // requireActiveEstablishment(), contrairement à createReservation() dans ce
  // même fichier. Même emplacement et mêmes messages, jamais reformulés.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette réservation." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier cette réservation." };
  }

  // Une réservation d'un autre établissement est indistinguable d'un id inexistant.
  const existing = await prisma.reservation.findFirst({ where: { id, establishmentId: user.establishmentId } });
  if (!existing) {
    return { message: "Réservation introuvable." };
  }
  if (existing.status !== "CONFIRMED") {
    return { message: "Cette réservation n'est plus modifiable (statut actuel)." };
  }

  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // Phase 8, Bloc 1: deposit/depositMethod are intentionally NOT taken from
  // this form anymore — they're frozen at whatever they were at creation
  // (already converted to a Payment row then, see createReservation). Once
  // real encaissements exist, silently overwriting the raw `deposit` column
  // from an edit form would desync it from the actual Payment history, which
  // is the single source of truth for money from now on (Bloc 5/6). New
  // encaissements go exclusively through "Encaisser" (Bloc 13). The two
  // fields are also hidden from the edit form itself — see reservation-form.tsx.
  const { clientId, propertyId, tariffId, date, arrivalTime, note } = parsed.data;

  // Lot "Reservation — client facultatif" : même traitement qu'à la
  // création — clientId peut être absent (séjour court). Phase 3D / Lot D4 —
  // `establishmentId` ajouté aux trois lectures : un `clientId`/`propertyId`/
  // `tariffId` d'un autre établissement est désormais traité exactement
  // comme un id inexistant (mêmes messages déjà présents ci-dessous).
  const [client, property, tariff] = await Promise.all([
    clientId
      ? prisma.client.findFirst({ where: { id: clientId, establishmentId: user.establishmentId } })
      : Promise.resolve(null),
    prisma.property.findFirst({ where: { id: propertyId, establishmentId: user.establishmentId } }),
    prisma.tariff.findFirst({ where: { id: tariffId, establishmentId: user.establishmentId } }),
  ]);
  if (clientId && !client) return { message: "Client introuvable." };
  if (!property) return { message: "Logement introuvable." };
  if (!property.active) return { message: "Ce logement est désactivé." };
  if (!tariff) return { message: "Tarif introuvable." };
  if (!tariff.active) return { message: "Ce tarif est désactivé." };
  if (tariff.propertyId !== propertyId) return { message: "Ce tarif n'appartient pas à ce logement." };

  const arrivalDateTime = new Date(`${date}T${arrivalTime}:00`);
  if (Number.isNaN(arrivalDateTime.getTime())) {
    return { message: "Date ou heure invalide." };
  }

  // Bloc 3/4: amount and duration stay pinned to whatever tariff was chosen
  // at creation, UNLESS the manager explicitly picks a different tariff in
  // this edit. Never resynced to today's Tariff pricing just because the
  // reservation happens to be getting edited (e.g. only the note changed).
  const tariffChanged = tariffId !== existing.tariffId;
  const durationValue = tariffChanged ? tariff.durationValue : existing.durationValue;
  const durationUnit = tariffChanged ? tariff.durationUnit : existing.durationUnit;
  const amount = tariffChanged ? tariff.amount : existing.amount;

  const departureDateTime = computeDepartureTime(arrivalDateTime, durationValue, durationUnit);

  // Lot "Reservation — client facultatif", section 7 : une édition ne doit
  // jamais pouvoir retirer le client d'un séjour >=48h (même seuil que
  // lib/identity.ts, réutilisé — pas de nouvelle constante). L'édition ne
  // redemande jamais les pièces d'identité (comportement inchangé, voir
  // reservation-form.tsx isEdit) : seule la présence du client est vérifiée
  // ici, pas checkIdentityRequirement (qui exigerait aussi des documents
  // jamais collectés par ce formulaire).
  if (requiresIdentity(arrivalDateTime, departureDateTime) && !client) {
    return { message: "Le client est obligatoire pour un séjour de 48 h ou plus." };
  }

  if (existing.deposit > amount) {
    return {
      message:
        "L'acompte déjà encaissé pour cette réservation dépasse le montant de ce tarif — choisissez un autre tarif.",
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const conflict = await findAvailabilityConflict(tx, {
          propertyId,
          arrivalTime: arrivalDateTime,
          departureTime: departureDateTime,
          excludeReservationId: id,
        });
        if (conflict) {
          throw new AvailabilityConflictError(formatConflictMessage(conflict));
        }
        // Phase 3D / Lot D4 — `updateMany` + vérification du `count` :
        // écriture finale filtrée par établissement en plus de l'id, jamais
        // seulement la vérification faite hors transaction ci-dessus.
        const result = await tx.reservation.updateMany({
          where: { id, establishmentId: user.establishmentId },
          data: {
            clientId: client?.id ?? null,
            propertyId,
            tariffId,
            date: new Date(`${date}T00:00:00`),
            arrivalTime: arrivalDateTime,
            departureTime: departureDateTime,
            durationValue,
            durationUnit,
            amount,
            // deposit/depositMethod deliberately omitted — frozen (see above).
            note,
          },
        });
        if (result.count === 0) {
          throw new AvailabilityConflictError("Réservation introuvable.");
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof AvailabilityConflictError) {
      return { message: error.message };
    }
    return {
      message:
        "Le créneau vient peut-être d'être réservé à l'instant par quelqu'un d'autre. Veuillez vérifier la disponibilité et réessayer.",
    };
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath(`/logements/${propertyId}`);
  redirect(`/reservations/${id}?updated=1`);
}

export async function cancelReservation(id: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment(), par
  // analogie directe avec le principe déjà établi pour toggleActive()/
  // toggleTariffActive() (D12-P52/P53) — une action qui RÉDUIT une
  // réservation future plutôt que d'en créer une nouvelle ne doit jamais être
  // bloquée par le statut de l'établissement ou l'expiration de l'abonnement :
  // un établissement suspendu doit au contraire rester capable de se
  // désengager de ses réservations en cours, jamais forcé de les maintenir
  // actives. `createReservation()`/`updateReservation()` (qui créent ou
  // prolongent un engagement) restent, elles, gardées.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'annuler cette réservation." };
  }

  // Phase 14 audit (Bloc 7): findUniqueOrThrow with no guard here would
  // throw uncaught for a nonexistent/tampered id — every other action in
  // this file already returns a graceful { error } instead. Phase 3D / Lot
  // D4 — une réservation d'un autre établissement suit désormais ce même
  // chemin "introuvable".
  const existing = await prisma.reservation.findFirst({ where: { id, establishmentId: user.establishmentId } });
  if (!existing) {
    return { error: "Réservation introuvable." };
  }
  // Phase 3G / Lot D12-P4 — faille confirmée en D12-P3 : cette fonction
  // n'exigeait auparavant aucun statut particulier, contrairement à
  // updateReservation ; seule l'interface masquait le bouton pour un statut
  // différent de CONFIRMED (restriction purement visuelle, jamais une
  // protection serveur). Une réservation ARRIVED pouvait ainsi être annulée
  // par un appel direct, désynchronisant son statut de la Rental déjà créée.
  if (existing.status !== "CONFIRMED") {
    return {
      error: "Cette réservation n'est plus annulable (statut actuel).",
    };
  }

  const result = await prisma.reservation.updateMany({
    where: { id, establishmentId: user.establishmentId },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) {
    return { error: "Réservation introuvable." };
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}
