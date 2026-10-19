"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { verifySession, getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { findAvailabilityConflict, type AvailabilityConflict } from "@/lib/availability";
import { checkIdentityRequirement, requiresIdentity } from "@/lib/identity";
import { checkRetroactiveArrival } from "@/lib/retroactive-checkin";
import { PHONE_REGEX } from "@/lib/phone";
import { ReservationSchema, type ReservationFormState } from "@/lib/definitions";
import { hasEstablishmentPermission } from "@/lib/permissions";

class RentalActionError extends Error {}

function formatConflictMessage(conflict: AvailabilityConflict) {
  const fmt = (d: Date) =>
    d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const who = conflict.kind === "rental" ? "occupe actuellement ce logement, départ prévu" : "a réservé ce logement du";
  return conflict.kind === "rental"
    ? `Indisponible : ${conflict.clientName} ${who} ${fmt(conflict.departureTime)}.`
    : `Indisponible : ${conflict.clientName} ${who} ${fmt(conflict.arrivalTime)} au ${fmt(conflict.departureTime)}.`;
}

function parseRentalForm(formData: FormData) {
  // Same field shape as a reservation (client/property/tariff/date/arrival/
  // deposit/method/note) — reusing ReservationSchema rather than
  // duplicating an identical schema for "Nouvelle location" (Bloc 6).
  return ReservationSchema.safeParse({
    clientId: formData.get("clientId"),
    propertyId: formData.get("propertyId"),
    tariffId: formData.get("tariffId"),
    date: formData.get("date"),
    arrivalTime: formData.get("arrivalTime"),
    deposit: formData.get("deposit"),
    depositMethod: formData.get("depositMethod") || undefined,
    note: formData.get("note") || undefined,
    idDocumentType: formData.get("idDocumentType") || undefined,
    idDocumentNumber: formData.get("idDocumentNumber") || undefined,
    retroactiveReason: formData.get("retroactiveReason") || undefined,
  });
}

/** Read-only live check for the "Nouvelle location" form — not the security boundary. */
export async function checkRentalAvailability(input: {
  propertyId: string;
  tariffId: string;
  date: string;
  arrivalTime: string;
  billingMode?: "HOUR" | "DAY";
  numberOfDays?: number;
}): Promise<{ available: boolean; message?: string; departureTime?: string; totalAmount?: number }> {
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

  const days = input.numberOfDays && input.numberOfDays > 1 ? input.numberOfDays : 1;
  const isDayBilling = input.billingMode === "DAY" || days > 1;
  const durationValue = isDayBilling && days > 1 ? days : tariff.durationValue;
  const durationUnit = isDayBilling && days > 1 ? "DAY" : tariff.durationUnit;
  const departureDateTime = computeDepartureTime(arrivalDateTime, durationValue, durationUnit);
  const totalAmount = isDayBilling && days > 1 ? tariff.amount * days : tariff.amount;

  const conflict = await findAvailabilityConflict(prisma, {
    propertyId: input.propertyId,
    arrivalTime: arrivalDateTime,
    departureTime: departureDateTime,
  });

  return {
    available: !conflict,
    message: conflict ? formatConflictMessage(conflict) : undefined,
    departureTime: departureDateTime.toISOString(),
    totalAmount,
  };
}

/** Bloc 6 — "Nouvelle location", sans réservation préalable. */
export async function createRentalDirect(
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  // Phase 3G / Lot D12-P6 — requireActiveEstablishment() placé en tout
  // premier, avant parseRentalForm et toute lecture métier, transaction ou
  // écriture. Comble l'incohérence confirmée en D12-P5 : "Nouvelle location
  // directe" crée elle aussi une nouvelle affaire commerciale (Rental +
  // Payment éventuel) sans réservation préalable, exactement comme
  // createReservation (déjà câblée, Lot D12-O13) — même squelette, mêmes
  // messages, aucune nouvelle politique inventée.
  // checkRentalAvailability()/completeRental()/cancelRental()/
  // checkExtensionAvailability()/extendRental()/checkInReservation restent
  // inchangées (hors périmètre de ce lot).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer une location." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // Support de la création rapide de client directement dans le formulaire
  const isNewClient =
    formData.get("isNewClient") === "true" ||
    formData.get("clientId") === "NEW" ||
    (!formData.get("clientId") && Boolean(formData.get("newClientName")));
  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const rawNewPhone = String(formData.get("newClientPhone") ?? "").trim();
  const newClientPhone = rawNewPhone.replace(/[\s.-]/g, "");

  if (isNewClient && (!formData.get("clientId") || formData.get("clientId") === "NEW")) {
    if (!newClientName) {
      return { errors: { clientId: ["Le nom du locataire est obligatoire."] } };
    }
    if (!newClientPhone || !PHONE_REGEX.test(newClientPhone)) {
      return { errors: { clientId: ["Numéro de téléphone invalide : 8 à 15 chiffres requis (ex: +221 77 000 00 00)."] } };
    }
    formData.set("clientId", "temp-inline-client");
  }

  const parsed = parseRentalForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  // Phase 7 Bloc 6 originally omitted "mode de paiement" from this form
  // (Rental has no depositMethod column, and payment-method tracking didn't
  // exist yet). Phase 8 reintroduces it here for one reason only: every
  // Payment row now requires a `method`, and this form collects the very
  // first amount of money for a direct rental — see the auto-created Payment
  // below. Rental itself still has no depositMethod column (unchanged).
  const {
    clientId,
    propertyId,
    tariffId,
    date,
    arrivalTime,
    deposit,
    depositMethod,
    note,
    idDocumentType,
    idDocumentNumber,
    retroactiveReason,
  } = parsed.data;

  // Phase 3F / Lot D12-I — chaque lecture filtrée par `establishmentId` :
  // un client/logement/tarif d'un autre établissement suit désormais
  // exactement le même message "introuvable"/"désactivé" déjà existant
  // ci-dessous, jamais une création référençant une ressource extérieure.
  const [existingClient, property, tariff] = await Promise.all([
    clientId !== "temp-inline-client"
      ? prisma.client.findFirst({ where: { id: clientId, establishmentId: user.establishmentId } })
      : Promise.resolve(null),
    prisma.property.findFirst({ where: { id: propertyId, establishmentId: user.establishmentId } }),
    prisma.tariff.findFirst({ where: { id: tariffId, establishmentId: user.establishmentId } }),
  ]);

  let client = existingClient;
  if (clientId === "temp-inline-client") {
    client = {
      id: "temp",
      name: newClientName,
      phone: newClientPhone,
      email: null,
      address: null,
      idDocumentType: null,
      idDocumentNumber: null,
      notes: null,
      establishmentId: user.establishmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  if (!client) return { message: "Client introuvable." };
  if (!property) return { message: "Logement introuvable." };
  if (!property.active) return { message: "Ce logement est désactivé." };
  if (!tariff) return { message: "Tarif introuvable." };
  if (!tariff.active) return { message: "Ce tarif est désactivé." };
  if (tariff.propertyId !== propertyId) return { message: "Ce tarif n'appartient pas à ce logement." };

  const arrivalDateTime = new Date(`${date}T${arrivalTime}:00`);
  if (Number.isNaN(arrivalDateTime.getTime())) {
    return { message: "Date ou heure invalide." };
  }

  // Bloc 21 — arrivée rétroactive : "Nouvelle location directe" acceptait déjà
  // n'importe quelle heure d'arrivée sans aucune validation passé/futur (un
  // trou de sécurité existant, pas un nouveau comportement). Même règle que
  // checkInReservation : jamais dans le futur, jamais plus de 24h dans le
  // passé, justification obligatoire dès que l'écart sort de la tolérance.
  const registeredAt = new Date();
  const effectiveRetroReason =
    retroactiveReason && retroactiveReason.trim().length > 0
      ? retroactiveReason.trim()
      : "Enregistrement différé (client arrivé plus tôt)";
  const retroCheck = checkRetroactiveArrival(registeredAt, arrivalDateTime, effectiveRetroReason);
  if (!retroCheck.ok) {
    return { message: retroCheck.message };
  }

  const billingMode = (formData.get("billingMode") as string) || "DAY";
  const rawDays = formData.get("numberOfDays");
  const numberOfDays = rawDays ? Math.max(1, parseInt(String(rawDays), 10) || 1) : 1;
  const isDayBilling = billingMode === "DAY";

  const durationValue = isDayBilling && numberOfDays > 1 ? numberOfDays : tariff.durationValue;
  const durationUnit = isDayBilling && numberOfDays > 1 ? "DAY" : tariff.durationUnit;
  const departureDateTime = computeDepartureTime(arrivalDateTime, durationValue, durationUnit);

  const amount = isDayBilling && numberOfDays > 1 ? tariff.amount * numberOfDays : tariff.amount;
  if (deposit > amount) {
    return { errors: { deposit: ["L'acompte ne peut pas dépasser le montant total."] } };
  }

  // Seuil pour la pièce d'identité et le contrat de location
  const settings = user.establishmentId
    ? await prisma.settings.findUnique({ where: { establishmentId: user.establishmentId } })
    : null;
  const thresholdDays = settings?.contractThresholdDays ?? 2;
  const isContractStay = isDayBilling && numberOfDays >= thresholdDays;
  const thresholdHours = isContractStay ? thresholdDays * 24 : 999999;

  const identityCheck = checkIdentityRequirement(
    arrivalDateTime,
    departureDateTime,
    client,
    {
      idDocumentType,
      idDocumentNumber,
    },
    thresholdHours,
  );
  if (!identityCheck.ok) {
    return { message: identityCheck.message };
  }

  let rentalId: string;
  try {
    rentalId = await prisma.$transaction(
      async (tx) => {
        const conflict = await findAvailabilityConflict(tx, {
          propertyId,
          arrivalTime: arrivalDateTime,
          departureTime: departureDateTime,
        });
        if (conflict) {
          throw new RentalActionError(formatConflictMessage(conflict));
        }

        let actualClientId = clientId;
        if (clientId === "temp-inline-client") {
          const createdClient = await tx.client.create({
            data: {
              name: newClientName,
              phone: newClientPhone,
              idDocumentType: identityCheck.updateClientWith?.idDocumentType ?? (idDocumentType?.trim() || null),
              idDocumentNumber: identityCheck.updateClientWith?.idDocumentNumber ?? (idDocumentNumber?.trim() || null),
              establishmentId: user.establishmentId,
            },
          });
          actualClientId = createdClient.id;
        } else if (identityCheck.updateClientWith) {
          await tx.client.update({ where: { id: clientId }, data: identityCheck.updateClientWith });
        }

        const rental = await tx.rental.create({
          data: {
            clientId: actualClientId,
            propertyId,
            tariffId,
            arrivalAt: arrivalDateTime,
            plannedDepartureAt: departureDateTime,
            durationValue,
            durationUnit,
            amount,
            deposit,
            note,
            registeredByUserId: user.id,
            retroactiveReason: retroCheck.isRetroactive ? retroactiveReason : null,
            establishmentId: user.establishmentId,
          },
        });
        // Bloc 15 — traçabilité : AuditLog créé atomiquement avec la Rental,
        // dans la même transaction Serializable (jamais l'un sans l'autre).
        // userId vient exclusivement de getCurrentUser(), jamais du formulaire.
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "RENTAL_CREATED_DIRECT",
            entityType: "Rental",
            entityId: rental.id,
            reason: retroCheck.isRetroactive ? (retroactiveReason ?? null) : null,
            oldValue: Prisma.DbNull,
            newValue: {
              arrivalAt: arrivalDateTime.toISOString(),
              plannedDepartureAt: departureDateTime.toISOString(),
              isRetroactive: retroCheck.isRetroactive,
            },
            establishmentId: user.establishmentId,
          },
        });
        // Phase 8, Bloc 1/5 — same rule as createReservation: the initial
        // acompte becomes a real Payment row atomically with the rental
        // itself, so totalPaid has a single source of truth from creation
        // onward. No Payment for deposit = 0.
        if (deposit > 0) {
          await tx.payment.create({
            data: {
              rentalId: rental.id,
              amount: deposit,
              method: depositMethod ?? "OTHER",
              establishmentId: user.establishmentId,
            },
          });
        }
        return rental.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof RentalActionError) {
      return { message: error.message };
    }
    return {
      message:
        "Le créneau vient peut-être d'être occupé à l'instant par quelqu'un d'autre. Veuillez vérifier la disponibilité et réessayer.",
    };
  }

  revalidatePath("/locations");
  revalidatePath(`/logements/${propertyId}`);
  redirect(`/locations/${rentalId}?created=1`);
}

/**
 * Bloc 5 — "Faire entrer" depuis une réservation CONFIRMED. Transactionnel :
 * la réservation ne passe ARRIVED que si la Location a bien été créée, et
 * réciproquement (Bloc 20) — jamais l'un sans l'autre.
 */
export async function checkInReservation(
  reservationId: string,
  options?: { actualArrivalAt?: string; reason?: string; clientId?: string },
): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : checkInReservation()
  // n'était gardée que par getCurrentUser(), jamais par
  // requireActiveEstablishment(), contrairement à createRentalDirect() dans
  // ce même fichier (D12-P6) — alors que cette fonction crée elle aussi une
  // Rental réelle (occupation effective d'un logement). Même emplacement et
  // mêmes messages que createRentalDirect(), jamais reformulés.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de faire entrer ce séjour." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de faire entrer ce séjour." };
  }

  // Phase 3G / Lot D12-P2 — filtrée par établissement (faille signalée en
  // D12-O16/D12-P1 : cette lecture n'appliquait auparavant aucun filtre,
  // permettant à un appelant d'un autre établissement de faire entrer un
  // séjour qui ne lui appartenait pas). `property`/`tariff`/`client` inclus
  // pour la défense en profondeur ci-dessous — ne jamais se fier uniquement
  // au filtre sur `Reservation.establishmentId` pour garantir que les
  // entités référencées appartiennent elles aussi au même établissement
  // (même principe que `contract-data.ts`).
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId: user.establishmentId },
    include: {
      property: { select: { establishmentId: true } },
      tariff: { select: { establishmentId: true } },
      client: { select: { establishmentId: true } },
    },
  });
  if (!reservation) {
    return { error: "Réservation introuvable." };
  }
  if (
    reservation.property.establishmentId !== user.establishmentId ||
    reservation.tariff.establishmentId !== user.establishmentId ||
    (reservation.client && reservation.client.establishmentId !== user.establishmentId)
  ) {
    // Incohérence qui ne devrait jamais exister (createReservation/
    // updateReservation ne rattachent déjà qu'à des entités du même
    // établissement) — traitée comme "introuvable", jamais révélée, par
    // défense en profondeur.
    return { error: "Réservation introuvable." };
  }
  if (reservation.status === "ARRIVED") {
    return { error: "Cette réservation a déjà donné lieu à une arrivée." };
  }
  if (reservation.status === "CANCELLED") {
    return { error: "Cette réservation est annulée et ne peut pas donner lieu à une arrivée." };
  }
  if (reservation.status !== "CONFIRMED") {
    return { error: "Cette réservation n'est plus confirmée." };
  }

  // Mini-lot "Check-in — identifier le client manquant" : Rental.clientId
  // reste obligatoire (non touché). Si la réservation a déjà un client, il
  // est utilisé tel quel — un `options.clientId` fourni par erreur n'écrase
  // JAMAIS silencieusement un client déjà associé (section 5). Si elle n'en
  // a pas (séjour court, lot "Reservation — client facultatif"), le client
  // choisi à l'écran de check-in devient obligatoire ici.
  let clientId: string;
  let clientWasMissing = false;
  if (reservation.clientId) {
    clientId = reservation.clientId;
  } else {
    // Incohérence qui ne devrait jamais exister (createReservation/
    // updateReservation imposent déjà un client dès 48h) : refuser
    // proprement plutôt que de laisser le petit sélecteur de check-in
    // "réparer" silencieusement une réservation qui aurait aussi dû
    // recueillir une pièce d'identité, jamais collectée ici.
    if (requiresIdentity(reservation.arrivalTime, reservation.departureTime)) {
      return {
        error:
          "Cette réservation de 48 h ou plus nécessite un client et une pièce d'identité — corrigez-la depuis sa fiche avant de faire entrer.",
      };
    }
    if (!options?.clientId) {
      return { error: "Un client est requis pour faire entrer ce séjour." };
    }
    // Existence vérifiée explicitement — jamais de confiance aveugle dans un
    // id transmis par le client. Phase 3G / Lot D12-P2 — filtrée par
    // établissement (faille signalée en D12-P1 : acceptait auparavant
    // n'importe quel client existant, y compris d'un autre établissement).
    const selectedClient = await prisma.client.findFirst({
      where: { id: options.clientId, establishmentId: user.establishmentId },
      select: { id: true },
    });
    if (!selectedClient) {
      return { error: "Client introuvable." };
    }
    clientId = selectedClient.id;
    clientWasMissing = true;
  }

  // Bloc 21 — arrivée rétroactive : si `options.actualArrivalAt` est fourni,
  // il remplace "maintenant" comme heure RÉELLE d'arrivée (le gestionnaire a
  // saisi le séjour après coup). Sans lui, comportement strictement
  // inchangé (Bloc 9 : arrivée = maintenant, jamais l'heure prévue de la
  // réservation, qui elle reste figée pour toujours).
  const registeredAt = new Date();
  const actualArrival = options?.actualArrivalAt ? new Date(options.actualArrivalAt) : registeredAt;
  if (Number.isNaN(actualArrival.getTime())) {
    return { error: "Heure d'arrivée invalide." };
  }
  const retroCheck = checkRetroactiveArrival(registeredAt, actualArrival, options?.reason);
  if (!retroCheck.ok) {
    return { error: retroCheck.message };
  }

  const plannedDeparture = computeDepartureTime(
    actualArrival,
    reservation.durationValue,
    reservation.durationUnit,
  );

  let rentalId: string;
  try {
    rentalId = await prisma.$transaction(
      async (tx) => {
        // Phase 3G / Lot D12-P2 — filtrée par établissement (même faille
        // que la lecture initiale ci-dessus) : `findFirstOrThrow` lève si
        // absente ou d'un autre établissement, tombant dans le `catch`
        // générique existant ci-dessous — jamais un message distinct qui
        // révélerait l'existence d'une réservation étrangère.
        const fresh = await tx.reservation.findFirstOrThrow({
          where: { id: reservationId, establishmentId: user.establishmentId },
        });
        if (fresh.status !== "CONFIRMED") {
          throw new RentalActionError("Cette réservation n'est plus confirmée.");
        }
        // Re-check availability against the ACTUAL window (arriving late
        // shifts the whole booked interval later — see Phase 7 report).
        const conflict = await findAvailabilityConflict(tx, {
          propertyId: reservation.propertyId,
          arrivalTime: actualArrival,
          departureTime: plannedDeparture,
          excludeReservationId: reservationId,
        });
        if (conflict) {
          throw new RentalActionError(formatConflictMessage(conflict));
        }
        const rental = await tx.rental.create({
          data: {
            clientId,
            propertyId: reservation.propertyId,
            reservationId: reservation.id,
            tariffId: reservation.tariffId,
            arrivalAt: actualArrival,
            plannedDepartureAt: plannedDeparture,
            durationValue: reservation.durationValue,
            durationUnit: reservation.durationUnit,
            amount: reservation.amount,
            deposit: reservation.deposit,
            // Phase 12, Bloc 7 fix: the reservation's note was silently
            // dropped on check-in — the master prompt explicitly requires
            // it be conserved ("note si applicable"). Self-caught during the
            // Phase 12 flow inspection.
            note: reservation.note,
            registeredByUserId: user.id,
            retroactiveReason: retroCheck.isRetroactive ? options?.reason : null,
            establishmentId: user.establishmentId,
          },
        });
        // Bloc 15 — traçabilité : même règle que createRentalDirect, AuditLog
        // atomique dans la même transaction Serializable.
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "RENTAL_CREATED_FROM_CHECKIN",
            entityType: "Rental",
            entityId: rental.id,
            reason: retroCheck.isRetroactive ? (options?.reason ?? null) : null,
            oldValue: Prisma.DbNull,
            newValue: {
              arrivalAt: actualArrival.toISOString(),
              plannedDepartureAt: plannedDeparture.toISOString(),
              isRetroactive: retroCheck.isRetroactive,
            },
            establishmentId: user.establishmentId,
          },
        });
        await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: "ARRIVED",
            // La réservation reflète désormais le client réellement entré —
            // sinon sa fiche afficherait "Sans client" indéfiniment malgré
            // une Location bien associée à un vrai client.
            ...(clientWasMissing ? { clientId } : {}),
          },
        });
        return rental.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof RentalActionError) {
      return { error: error.message };
    }
    return {
      error:
        "Le logement vient peut-être d'être occupé à l'instant. Veuillez vérifier la disponibilité et réessayer.",
    };
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/locations");
  revalidatePath(`/logements/${reservation.propertyId}`);
  redirect(`/locations/${rentalId}?created=1`);
}

/**
 * Bloc 13 — "Terminer". Transaction Serializable (Bloc K.1) : relit le
 * statut dans la transaction avant d'écrire — un deuxième `completeRental()`
 * concurrent sur la même Rental échoue proprement au lieu d'écraser
 * silencieusement `actualDepartureAt` (même pattern que
 * `cancelBankTransfer()`, Bloc I.1).
 */
export async function completeRental(id: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment(), même
  // principe que cancelReservation()/cancelRental() dans ce fichier — terminer
  // normalement un séjour EN COURS réduit l'exposition de l'établissement
  // (libère le logement), jamais ne l'augmente. Un établissement suspendu
  // doit rester capable de clôturer ses locations déjà actives.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible de terminer cette location." };
  }

  // Une location d'un autre établissement est indistinguable d'un id inexistant.
  const rental = await prisma.rental.findFirst({ where: { id, establishmentId: user.establishmentId } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3D / Lot D4 — la relecture transactionnelle doit elle aussi
        // filtrer par établissement : une vérification faite uniquement
        // hors transaction (ci-dessus) ne suffit pas, cette relecture est le
        // seul état réellement garanti au moment de l'écriture qui suit.
        const fresh = await tx.rental.findFirstOrThrow({ where: { id, establishmentId: user.establishmentId } });
        if (fresh.status !== "ACTIVE") {
          throw new RentalActionError("Cette location n'est plus active.");
        }
        const result = await tx.rental.updateMany({
          where: { id, establishmentId: user.establishmentId },
          data: { status: "COMPLETED", actualDepartureAt: new Date() },
        });
        if (result.count === 0) {
          throw new RentalActionError("Location introuvable.");
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof RentalActionError) {
      return { error: error.message };
    }
    return {
      error: "Cette location vient peut-être d'être clôturée à l'instant (opération concurrente). Veuillez réessayer.",
    };
  }

  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  revalidatePath(`/logements/${rental.propertyId}`);
  return {};
}

/** Annulation (Bloc 4 "si nécessaire") — avant la fin réelle du séjour. */
export async function cancelRental(id: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — décision explicite, même principe que
  // completeRental()/cancelReservation() ci-dessus : volontairement JAMAIS
  // gardée par requireActiveEstablishment() — annuler une location réduit
  // l'exposition de l'établissement, jamais ne l'augmente.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'annuler cette location." };
  }

  if (!hasEstablishmentPermission(user, "CAN_DELETE_RENTAL")) {
    return { error: "Action refusée : votre compte n'a pas l'autorisation d'annuler les locations." };
  }

  const rental = await prisma.rental.findFirst({ where: { id, establishmentId: user.establishmentId } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  // Phase 3G / Lot D12-P18 — faille confirmée en D12-P17 : contrairement à
  // completeRental/extendRental, ce filtre ne portait pas sur `status`,
  // laissant une fenêtre de course où une location passée à COMPLETED (ou
  // tout autre statut) par une opération concurrente juste avant cette
  // écriture pouvait malgré tout être annulée. `status: "ACTIVE"` ajouté au
  // `where` rend ce contrôle atomique avec l'écriture elle-même.
  const result = await prisma.rental.updateMany({
    where: { id, establishmentId: user.establishmentId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) {
    return { error: "Cette location n'est plus active." };
  }

  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  revalidatePath(`/logements/${rental.propertyId}`);
  return {};
}

/**
 * Read-only live check for the extension picker — mirrors
 * checkRentalAvailability, checked against [currentEnd, newEnd).
 */
export async function checkExtensionAvailability(input: {
  rentalId: string;
  tariffId: string;
}): Promise<{ available: boolean; message?: string; newEnd?: string }> {
  // Phase 3G / Lot D12-P11 — faille confirmée en D12-P10 : ni la location ni
  // le tarif n'étaient filtrés par établissement, permettant à un appelant
  // authentifié d'interroger la disponibilité réelle (nom de client inclus
  // via formatConflictMessage) d'une location appartenant à un autre
  // établissement. `getCurrentUser()` remplace `verifySession()` pour
  // disposer de `establishmentId` ; même réponse `{ available: false }`
  // pour un id absent ou étranger — jamais révélé lequel.
  const user = await getCurrentUser();
  if (!user.establishmentId) return { available: false };

  const rental = await prisma.rental.findFirst({
    where: { id: input.rentalId, establishmentId: user.establishmentId },
  });
  if (!rental || rental.status !== "ACTIVE") return { available: false };

  const tariff = await prisma.tariff.findFirst({
    where: { id: input.tariffId, establishmentId: user.establishmentId },
  });
  if (!tariff || tariff.propertyId !== rental.propertyId) return { available: false };

  const newEnd = computeDepartureTime(rental.plannedDepartureAt, tariff.durationValue, tariff.durationUnit);

  const conflict = await findAvailabilityConflict(prisma, {
    propertyId: rental.propertyId,
    arrivalTime: rental.plannedDepartureAt,
    departureTime: newEnd,
    excludeRentalId: rental.id,
  });

  return {
    available: !conflict,
    message: conflict ? formatConflictMessage(conflict) : undefined,
    newEnd: newEnd.toISOString(),
  };
}

/**
 * Bloc 14/15 — prolongation. `tariffId` is one of the property's own active
 * tariffs (see the Phase 7 report: extension pricing is always a real
 * configured tariff amount, never an invented flat "+2h" price that might
 * not match what this property actually charges for 2 hours).
 */
export async function extendRental(rentalId: string, tariffId: string): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P9 — requireActiveEstablishment() placé en tout
  // premier, avant toute lecture métier. Comble l'incohérence confirmée en
  // D12-P8 : une prolongation crée une nouvelle période facturable (nouvelle
  // RentalExtension, montant dû incrémenté), contrairement à
  // completeRental/cancelRental/checkInReservation qui ne font que clôturer
  // ou gérer un engagement déjà existant — même raisonnement que pour
  // createReservation/createRentalDirect (déjà câblées), mêmes messages,
  // aucune nouvelle politique inventée.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible de prolonger cette location." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // La location doit appartenir à l'établissement courant — indistinguable
  // d'un id inexistant sinon.
  const rental = await prisma.rental.findFirst({ where: { id: rentalId, establishmentId: user.establishmentId } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  // Le tarif de prolongation doit lui aussi appartenir au même établissement
  // (en plus du contrôle déjà existant : compatible avec le bien de la
  // location, via `tariff.propertyId !== rental.propertyId`).
  const tariff = await prisma.tariff.findFirst({ where: { id: tariffId, establishmentId: user.establishmentId } });
  if (!tariff || tariff.propertyId !== rental.propertyId || !tariff.active) {
    return { error: "Tarif de prolongation invalide pour ce logement." };
  }

  const newEnd = computeDepartureTime(rental.plannedDepartureAt, tariff.durationValue, tariff.durationUnit);

  try {
    await prisma.$transaction(
      async (tx) => {
        // Phase 3G / Lot D12-P9 — faille confirmée en D12-P8 : contrairement
        // à completeRental, cette transaction ne relisait jusqu'ici jamais
        // le statut de la location, et l'écriture finale ne le filtrait pas
        // non plus — une location clôturée/annulée de façon concurrente
        // juste avant cette transaction pouvait malgré tout être prolongée.
        // Même pattern que completeRental : relecture filtrée par
        // établissement, refus avant toute vérification de conflit et toute
        // écriture si le statut n'est plus ACTIVE.
        const fresh = await tx.rental.findFirstOrThrow({
          where: { id: rentalId, establishmentId: user.establishmentId },
        });
        if (fresh.status !== "ACTIVE") {
          throw new RentalActionError("Cette location n'est plus active.");
        }
        const conflict = await findAvailabilityConflict(tx, {
          propertyId: rental.propertyId,
          arrivalTime: rental.plannedDepartureAt,
          departureTime: newEnd,
          excludeRentalId: rental.id,
        });
        if (conflict) {
          throw new RentalActionError(formatConflictMessage(conflict));
        }
        // Phase 3D / Lot D4 — gap découvert en Lot D1 : cette création ne
        // rattachait jusqu'ici `RentalExtension` à aucun établissement. Le
        // champ existe et est nullable dans le schéma (Phase 1 multi-tenant,
        // jamais appliqué) — corrigé ici avec la valeur de la location déjà
        // vérifiée ci-dessus, jamais une valeur distincte ou devinée.
        await tx.rentalExtension.create({
          data: {
            rentalId: rental.id,
            durationValue: tariff.durationValue,
            durationUnit: tariff.durationUnit,
            amount: tariff.amount,
            establishmentId: rental.establishmentId,
          },
        });
        const result = await tx.rental.updateMany({
          where: { id: rentalId, establishmentId: user.establishmentId },
          data: { plannedDepartureAt: newEnd, amount: { increment: tariff.amount } },
        });
        if (result.count === 0) {
          throw new RentalActionError("Location introuvable.");
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof RentalActionError) {
      return { error: error.message };
    }
    return {
      error:
        "Le créneau vient peut-être d'être occupé à l'instant. Veuillez vérifier la disponibilité et réessayer.",
    };
  }

  revalidatePath("/locations");
  revalidatePath(`/locations/${rentalId}`);
  revalidatePath(`/logements/${rental.propertyId}`);
  return {};
}
