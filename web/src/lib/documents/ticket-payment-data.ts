import "server-only";
// Chargement du ticket de caisse d'un paiement de séjour (hôtel) : partagé par le PDF et la page imprimable.
// Tout vient de la base, filtré par l'établissement de la session : un séjour ou un paiement d'un autre
// établissement est indistinguable d'un identifiant inexistant.
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings-data";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { formatDuration } from "@/lib/duration";
import { brandFromSettings } from "@/lib/documents/brand-data";
import { buildPaymentTicket } from "@/lib/documents/ticket-from-payment";
import { TICKET_WIDTHS } from "@/lib/documents/preview-params";
import type { TicketDoc, TicketWidth } from "@/lib/documents/types";

export type PaymentTicketResult =
  | { status: "ok"; doc: TicketDoc; paper: TicketWidth; themeId: number }
  | { status: "not-found" }
  | { status: "incomplete" };

/** Identifiant spécial : ticket « récapitulatif de séjour » (aucun paiement encore, ou vue d'ensemble du séjour). */
export const STAY_SUMMARY_KEY = "stay";

export async function loadPaymentTicket(rentalId: string, paymentId: string): Promise<PaymentTicketResult> {
  const user = await getCurrentUser();
  const establishmentId = user.establishmentId;
  const summaryOnly = paymentId === STAY_SUMMARY_KEY;
  if (!establishmentId || (!summaryOnly && !/^[a-z0-9_]{6,40}$/i.test(paymentId))) return { status: "not-found" };

  const establishment = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { businessMode: true } });
  if (establishment?.businessMode !== "HOTEL") return { status: "not-found" };

  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, establishmentId },
    select: {
      amount: true,
      arrivalAt: true,
      plannedDepartureAt: true,
      durationValue: true,
      durationUnit: true,
      reservationId: true,
      client: { select: { name: true } },
      property: { select: { name: true } },
    },
  });
  if (!rental) return { status: "not-found" };

  const related = { OR: [{ rentalId }, ...(rental.reservationId ? [{ reservationId: rental.reservationId }] : [])] };
  const [payment, latest, charges, summary, settings] = await Promise.all([
    summaryOnly
      ? Promise.resolve(null)
      : prisma.payment.findFirst({
          where: { id: paymentId, establishmentId, ...related },
          select: { id: true, amount: true, method: true, paidAt: true, reference: true },
        }),
    prisma.payment.findFirst({ where: { establishmentId, ...related }, orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], select: { id: true } }),
    prisma.rentalCharge.findMany({ where: { rentalId, establishmentId }, orderBy: { createdAt: "asc" }, select: { label: true, amount: true } }),
    getRentalPaymentSummary(prisma, rentalId),
    getSettings(),
  ]);
  if (!payment && !summaryOnly) return { status: "not-found" };
  // Établissement sans coordonnées enregistrées : pas de ticket avec des coordonnées inventées.
  if (!settings) return { status: "incomplete" };

  const paper: TicketWidth = (TICKET_WIDTHS as readonly string[]).includes(settings.documentTicketPaper) ? (settings.documentTicketPaper as TicketWidth) : "80";
  const brand = await brandFromSettings(settings);
  if (summaryOnly) {
    // Récapitulatif du séjour : utile dès l'arrivée du client, même sans encaissement.
    const chargesTotal = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const doc: TicketDoc = {
      kind: "STAY_SUMMARY",
      number: `S-${rentalId.slice(-5).toUpperCase()}`,
      issuedAt: new Date(),
      brand,
      cashier: null,
      client: rental.client?.name ?? null,
      property: rental.property.name,
      stay: { arrival: rental.arrivalAt, departure: rental.plannedDepartureAt },
      lines: [
        { label: `${rental.property.name}, ${formatDuration(rental.durationValue, rental.durationUnit).toLowerCase()}`, amount: rental.amount - chargesTotal },
        ...charges.map((charge) => ({ label: charge.label, amount: charge.amount })),
      ],
      total: rental.amount,
      amount: summary.totalPaid,
      method: null,
      reference: null,
      remaining: summary.remaining,
      tax: null,
      note: null,
    };
    return { status: "ok", doc, paper, themeId: settings.documentTicketTheme };
  }
  if (!payment) return { status: "not-found" };
  const doc = buildPaymentTicket({
    brand,
    payment,
    clientName: rental.client?.name ?? null,
    propertyName: rental.property.name,
    arrival: rental.arrivalAt,
    departure: rental.plannedDepartureAt,
    durationLabel: formatDuration(rental.durationValue, rental.durationUnit),
    rentalAmount: rental.amount,
    charges,
    isLatestPayment: latest?.id === payment.id,
    remaining: summary.remaining,
  });
  return { status: "ok", doc, paper, themeId: settings.documentTicketTheme };
}
