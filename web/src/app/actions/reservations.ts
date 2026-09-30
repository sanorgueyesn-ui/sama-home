"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { findConflictingReservation } from "@/lib/availability";
import { ReservationSchema, type ReservationFormState } from "@/lib/definitions";

function parseReservationForm(formData: FormData) {
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

class AvailabilityConflictError extends Error {}

function formatConflictMessage(conflict: {
  arrivalTime: Date;
  departureTime: Date;
  client: { name: string };
}) {
  const fmt = (d: Date) =>
    d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `Indisponible : ${conflict.client.name} occupe déjà ce logement du ${fmt(conflict.arrivalTime)} au ${fmt(conflict.departureTime)}.`;
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

  const conflict = await findConflictingReservation(prisma, {
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
  await verifySession();

  const parsed = parseReservationForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { clientId, propertyId, tariffId, date, arrivalTime, deposit, depositMethod, note } = parsed.data;

  // Bloc 17 — every existence/coherence rule re-checked server-side.
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

  // The amount is ALWAYS the tariff's current amount — never a client-
  // submitted value (Bloc 13 + Bloc 17: never trust the browser for money).
  const amount = tariff.amount;
  if (deposit > amount) {
    return { errors: { deposit: ["L'acompte ne peut pas dépasser le montant total."] } };
  }

  let reservationId: string;
  try {
    reservationId = await prisma.$transaction(
      async (tx) => {
        const conflict = await findConflictingReservation(tx, {
          propertyId,
          arrivalTime: arrivalDateTime,
          departureTime: departureDateTime,
        });
        if (conflict) {
          throw new AvailabilityConflictError(formatConflictMessage(conflict));
        }
        const reservation = await tx.reservation.create({
          data: {
            clientId,
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
          },
        });
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
  await verifySession();

  const existing = await prisma.reservation.findUnique({ where: { id } });
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

  // Bloc 3/4: amount and duration stay pinned to whatever tariff was chosen
  // at creation, UNLESS the manager explicitly picks a different tariff in
  // this edit. Never resynced to today's Tariff pricing just because the
  // reservation happens to be getting edited (e.g. only the note changed).
  const tariffChanged = tariffId !== existing.tariffId;
  const durationValue = tariffChanged ? tariff.durationValue : existing.durationValue;
  const durationUnit = tariffChanged ? tariff.durationUnit : existing.durationUnit;
  const amount = tariffChanged ? tariff.amount : existing.amount;

  const departureDateTime = computeDepartureTime(arrivalDateTime, durationValue, durationUnit);

  if (deposit > amount) {
    return { errors: { deposit: ["L'acompte ne peut pas dépasser le montant total."] } };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const conflict = await findConflictingReservation(tx, {
          propertyId,
          arrivalTime: arrivalDateTime,
          departureTime: departureDateTime,
          excludeReservationId: id,
        });
        if (conflict) {
          throw new AvailabilityConflictError(formatConflictMessage(conflict));
        }
        await tx.reservation.update({
          where: { id },
          data: {
            clientId,
            propertyId,
            tariffId,
            date: new Date(`${date}T00:00:00`),
            arrivalTime: arrivalDateTime,
            departureTime: departureDateTime,
            durationValue,
            durationUnit,
            amount,
            deposit,
            depositMethod: depositMethod ?? null,
            note,
          },
        });
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

export async function cancelReservation(id: string) {
  await verifySession();

  const existing = await prisma.reservation.findUniqueOrThrow({ where: { id } });
  await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath(`/logements/${existing.propertyId}`);
}
