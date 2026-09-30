"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { findAvailabilityConflict, type AvailabilityConflict } from "@/lib/availability";
import { ReservationSchema, type ReservationFormState } from "@/lib/definitions";

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
    depositMethod: formData.get("depositMethod"),
    note: formData.get("note"),
  });
}

/** Read-only live check for the "Nouvelle location" form — not the security boundary. */
export async function checkRentalAvailability(input: {
  propertyId: string;
  tariffId: string;
  date: string;
  arrivalTime: string;
}): Promise<{ available: boolean; message?: string; departureTime?: string }> {
  await verifySession();

  if (!input.propertyId || !input.tariffId || !input.date || !input.arrivalTime) {
    return { available: false };
  }
  const tariff = await prisma.tariff.findUnique({ where: { id: input.tariffId } });
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
  });

  return {
    available: !conflict,
    message: conflict ? formatConflictMessage(conflict) : undefined,
    departureTime: departureDateTime.toISOString(),
  };
}

/** Bloc 6 — "Nouvelle location", sans réservation préalable. */
export async function createRentalDirect(
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  await verifySession();

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
  const { clientId, propertyId, tariffId, date, arrivalTime, deposit, depositMethod, note } = parsed.data;

  const [client, property, tariff] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.property.findUnique({ where: { id: propertyId } }),
    prisma.tariff.findUnique({ where: { id: tariffId } }),
  ]);
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
  const departureDateTime = computeDepartureTime(arrivalDateTime, tariff.durationValue, tariff.durationUnit);

  const amount = tariff.amount; // never a client-submitted value
  if (deposit > amount) {
    return { errors: { deposit: ["L'acompte ne peut pas dépasser le montant total."] } };
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
        const rental = await tx.rental.create({
          data: {
            clientId,
            propertyId,
            tariffId,
            arrivalAt: arrivalDateTime,
            plannedDepartureAt: departureDateTime,
            durationValue: tariff.durationValue,
            durationUnit: tariff.durationUnit,
            amount,
            deposit,
            note,
          },
        });
        // Phase 8, Bloc 1/5 — same rule as createReservation: the initial
        // acompte becomes a real Payment row atomically with the rental
        // itself, so totalPaid has a single source of truth from creation
        // onward. No Payment for deposit = 0.
        if (deposit > 0) {
          await tx.payment.create({
            data: { rentalId: rental.id, amount: deposit, method: depositMethod ?? "OTHER" },
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
export async function checkInReservation(reservationId: string): Promise<{ error?: string }> {
  await verifySession();

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
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

  // Actual arrival = now (Bloc 9: never the reservation's planned time — the
  // reservation itself keeps its original arrivalTime forever).
  const actualArrival = new Date();
  const plannedDeparture = computeDepartureTime(
    actualArrival,
    reservation.durationValue,
    reservation.durationUnit,
  );

  let rentalId: string;
  try {
    rentalId = await prisma.$transaction(
      async (tx) => {
        const fresh = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
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
            clientId: reservation.clientId,
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
          },
        });
        await tx.reservation.update({ where: { id: reservationId }, data: { status: "ARRIVED" } });
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

/** Bloc 13 — "Terminer". */
export async function completeRental(id: string): Promise<{ error?: string }> {
  await verifySession();

  const rental = await prisma.rental.findUnique({ where: { id } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  await prisma.rental.update({
    where: { id },
    data: { status: "COMPLETED", actualDepartureAt: new Date() },
  });

  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  revalidatePath(`/logements/${rental.propertyId}`);
  return {};
}

/** Annulation (Bloc 4 "si nécessaire") — avant la fin réelle du séjour. */
export async function cancelRental(id: string): Promise<{ error?: string }> {
  await verifySession();

  const rental = await prisma.rental.findUnique({ where: { id } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  await prisma.rental.update({ where: { id }, data: { status: "CANCELLED" } });

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
  await verifySession();

  const rental = await prisma.rental.findUnique({ where: { id: input.rentalId } });
  if (!rental || rental.status !== "ACTIVE") return { available: false };

  const tariff = await prisma.tariff.findUnique({ where: { id: input.tariffId } });
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
  await verifySession();

  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) return { error: "Location introuvable." };
  if (rental.status !== "ACTIVE") return { error: "Cette location n'est plus active." };

  const tariff = await prisma.tariff.findUnique({ where: { id: tariffId } });
  if (!tariff || tariff.propertyId !== rental.propertyId || !tariff.active) {
    return { error: "Tarif de prolongation invalide pour ce logement." };
  }

  const newEnd = computeDepartureTime(rental.plannedDepartureAt, tariff.durationValue, tariff.durationUnit);

  try {
    await prisma.$transaction(
      async (tx) => {
        const conflict = await findAvailabilityConflict(tx, {
          propertyId: rental.propertyId,
          arrivalTime: rental.plannedDepartureAt,
          departureTime: newEnd,
          excludeRentalId: rental.id,
        });
        if (conflict) {
          throw new RentalActionError(formatConflictMessage(conflict));
        }
        await tx.rentalExtension.create({
          data: {
            rentalId: rental.id,
            durationValue: tariff.durationValue,
            durationUnit: tariff.durationUnit,
            amount: tariff.amount,
          },
        });
        await tx.rental.update({
          where: { id: rentalId },
          data: { plannedDepartureAt: newEnd, amount: { increment: tariff.amount } },
        });
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
