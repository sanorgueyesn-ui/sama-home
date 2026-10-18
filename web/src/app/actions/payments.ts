"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : encaisser un
  // paiement crée un nouvel enregistrement financier réel, jamais
  // risk-reducing — gardée comme toute autre création de ce lot.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'encaisser ce paiement." };
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
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'encaisser ce paiement." };
  }

  // Une réservation d'un autre établissement est indistinguable d'un id
  // inexistant — même message, même chemin de code.
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, establishmentId: user.establishmentId },
  });
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
        // trusting whatever "reste" the browser displayed. Phase 3D / Lot
        // D9 — cette relecture doit elle aussi filtrer par établissement :
        // la vérification faite hors transaction ci-dessus ne suffit pas
        // seule.
        const fresh = await tx.reservation.findFirstOrThrow({
          where: { id: reservationId, establishmentId: user.establishmentId },
        });
        if (fresh.status !== "CONFIRMED") {
          throw new PaymentActionError("Cette réservation n'accepte plus de nouveaux encaissements.");
        }
        const summary = await getReservationPaymentSummary(tx, reservationId);
        if (amount > summary.remaining) {
          throw new PaymentActionError(
            `Le montant dépasse le reste à payer (${summary.remaining.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA).`,
          );
        }
        // Phase 3D / Lot D9 — `establishmentId` provenant exclusivement de
        // l'utilisateur authentifié, jamais du formulaire ni de la
        // réservation (déjà vérifiée appartenir au même établissement
        // ci-dessus, donc identique en pratique, mais la source de vérité
        // reste `user`).
        await tx.payment.create({
          data: { reservationId, amount, method, reference, note, establishmentId: user.establishmentId },
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
  // Phase 3G / Lot D12-P110 — même correction que createReservationPayment()
  // ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'encaisser ce paiement." };
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
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'encaisser ce paiement." };
  }

  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, establishmentId: user.establishmentId },
  });
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
        // Phase 3D / Lot D9 — relecture transactionnelle elle aussi filtrée
        // par établissement.
        const fresh = await tx.rental.findFirstOrThrow({
          where: { id: rentalId, establishmentId: user.establishmentId },
        });
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
          data: { rentalId, amount, method, reference, note, establishmentId: user.establishmentId },
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
