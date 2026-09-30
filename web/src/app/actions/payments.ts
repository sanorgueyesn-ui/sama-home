"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { PaymentSchema, type PaymentFormState } from "@/lib/definitions";
import { getReservationPaymentSummary, getRentalPaymentSummary } from "@/lib/payment-summary";

class PaymentActionError extends Error {}

function parsePaymentForm(formData: FormData) {
  return PaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    note: formData.get("note"),
  });
}

/**
 * Bloc 13 — "Encaisser" depuis une réservation. Réservé aux réservations
 * CONFIRMED : une fois "Faire entrer" exécuté (ARRIVED), tout nouvel
 * encaissement se fait depuis la location (Bloc 14), jamais plus ici — la
 * réservation reste consultable (historique) mais n'accepte plus de nouveau
 * paiement direct.
 */
export async function createReservationPayment(
  reservationId: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await verifySession();

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { message: "Réservation introuvable." };
  }
  if (reservation.status !== "CONFIRMED") {
    return {
      message:
        reservation.status === "ARRIVED"
          ? "Cette réservation a donné lieu à une arrivée — encaissez depuis la location correspondante."
          : "Cette réservation n'accepte plus de nouveaux encaissements (statut actuel).",
    };
  }

  const parsed = parsePaymentForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { amount, method, reference, note } = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Bloc 17 — re-verified server-side, inside the transaction, never
        // trusting whatever "reste" the browser displayed.
        const fresh = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
        if (fresh.status !== "CONFIRMED") {
          throw new PaymentActionError("Cette réservation n'accepte plus de nouveaux encaissements.");
        }
        const summary = await getReservationPaymentSummary(tx, reservationId);
        if (amount > summary.remaining) {
          throw new PaymentActionError(
            `Le montant dépasse le reste à payer (${summary.remaining.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA).`,
          );
        }
        await tx.payment.create({
          data: { reservationId, amount, method, reference, note },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof PaymentActionError) {
      return { message: error.message };
    }
    // Bloc 18 — a real concurrent encaissement can make Postgres abort this
    // transaction under Serializable isolation even though the read above
    // found room for it a moment earlier; that's the protection working, not
    // a bug (see the Phase 6/7 reports for the same documented behavior).
    return {
      message:
        "Le reste à payer vient peut-être de changer à l'instant (autre encaissement concurrent). Veuillez vérifier et réessayer.",
    };
  }

  revalidatePath(`/reservations/${reservationId}`);
  redirect(`/reservations/${reservationId}?paid=1`);
}

/** Bloc 14 — "Encaisser" depuis une location, réservé aux locations ACTIVE. */
export async function createRentalPayment(
  rentalId: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await verifySession();

  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) {
    return { message: "Location introuvable." };
  }
  if (rental.status !== "ACTIVE") {
    return { message: "Cette location n'est plus active — aucun nouvel encaissement possible." };
  }

  const parsed = parsePaymentForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { amount, method, reference, note } = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        const fresh = await tx.rental.findUniqueOrThrow({ where: { id: rentalId } });
        if (fresh.status !== "ACTIVE") {
          throw new PaymentActionError("Cette location n'est plus active.");
        }
        const summary = await getRentalPaymentSummary(tx, rentalId);
        if (amount > summary.remaining) {
          throw new PaymentActionError(
            `Le montant dépasse le reste à payer (${summary.remaining.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA).`,
          );
        }
        await tx.payment.create({
          data: { rentalId, amount, method, reference, note },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof PaymentActionError) {
      return { message: error.message };
    }
    return {
      message:
        "Le reste à payer vient peut-être de changer à l'instant (autre encaissement concurrent). Veuillez vérifier et réessayer.",
    };
  }

  revalidatePath(`/locations/${rentalId}`);
  redirect(`/locations/${rentalId}?paid=1`);
}
