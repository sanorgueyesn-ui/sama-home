"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { computeDepartureTime } from "@/lib/duration";
import { findAvailabilityConflict, type AvailabilityConflict } from "@/lib/availability";
import { checkIdentityRequirement } from "@/lib/identity";
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
    idDocumentType: formData.get("idDocumentType"),
    idDocumentNumber: formData.get("idDocumentNumber"),
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
  const { clientId, propertyId, tariffId, date, arrivalTime, deposit, depositMethod, note, idDocumentType, idDocumentNumber } = parsed.data;

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

  // Audit Client/Réservation, Bloc 3/4 — identité obligatoire côté serveur
  // à partir de 48h réelles, jamais uniquement côté interface. Calculé ici
  // (avant la transaction) pour pouvoir refuser immédiatement avec un
  // message clair ; la mise à jour du client, elle, reste dans la
  // transaction ci-dessous pour rester atomique avec la réservation.
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
        if (identityCheck.updateClientWith) {
          await tx.client.update({ where: { id: clientId }, data: identityCheck.updateClientWith });
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
  // Phase 8, Bloc 1: deposit/depositMethod are intentionally NOT taken from
  // this form anymore — they're frozen at whatever they were at creation
  // (already converted to a Payment row then, see createReservation). Once
  // real encaissements exist, silently overwriting the raw `deposit` column
  // from an edit form would desync it from the actual Payment history, which
  // is the single source of truth for money from now on (Bloc 5/6). New
  // encaissements go exclusively through "Encaisser" (Bloc 13). The two
  // fields are also hidden from the edit form itself — see reservation-form.tsx.
  const { clientId, propertyId, tariffId, date, arrivalTime, note } = parsed.data;

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
            // deposit/depositMethod deliberately omitted — frozen (see above).
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

export async function cancelReservation(id: string): Promise<{ error?: string }> {
  await verifySession();

  // Phase 14 audit (Bloc 7): findUniqueOrThrow with no guard here would
  // throw uncaught for a nonexistent/tampered id — every other action in
  // this file already returns a graceful { error } instead.
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Réservation introuvable." };
  }

  await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}
