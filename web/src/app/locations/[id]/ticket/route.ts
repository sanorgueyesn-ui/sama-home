import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings-data";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { formatDuration } from "@/lib/duration";
import { brandFromSettings } from "@/lib/documents/brand-data";
import { buildPaymentTicket } from "@/lib/documents/ticket-from-payment";
import { renderTicketPdf } from "@/lib/documents/ticket-document";
import { TICKET_WIDTHS } from "@/lib/documents/preview-params";
import type { TicketWidth } from "@/lib/documents/types";

// @react-pdf/renderer dépend de modules Node : jamais exécutable sur le runtime Edge.
export const runtime = "nodejs";

/**
 * Ticket de caisse d'un paiement d'un séjour (hôtel uniquement : les résidences n'ont pas de ticket). Tout
 * vient de la base, filtré par l'établissement de la session : un séjour ou un paiement d'un autre
 * établissement est indistinguable d'un identifiant inexistant (404). Seul `payment` vient de l'URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paymentId = new URL(request.url).searchParams.get("payment") ?? "";
  const user = await getCurrentUser();
  const establishmentId = user.establishmentId;
  const notFound = () => NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  if (!establishmentId || !/^[a-z0-9_]{6,40}$/i.test(paymentId)) return notFound();

  const establishment = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { businessMode: true } });
  if (establishment?.businessMode !== "HOTEL") return notFound();

  const rental = await prisma.rental.findFirst({
    where: { id, establishmentId },
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
  if (!rental) return notFound();

  const related = { OR: [{ rentalId: id }, ...(rental.reservationId ? [{ reservationId: rental.reservationId }] : [])] };
  const [payment, latest, charges, summary, settings] = await Promise.all([
    prisma.payment.findFirst({
      where: { id: paymentId, establishmentId, ...related },
      select: { id: true, amount: true, method: true, paidAt: true, reference: true },
    }),
    prisma.payment.findFirst({ where: { establishmentId, ...related }, orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], select: { id: true } }),
    prisma.rentalCharge.findMany({ where: { rentalId: id, establishmentId }, orderBy: { createdAt: "asc" }, select: { label: true, amount: true } }),
    getRentalPaymentSummary(prisma, id),
    getSettings(),
  ]);
  if (!payment) return notFound();
  // Établissement sans coordonnées enregistrées : pas de ticket avec des coordonnées inventées.
  if (!settings) return NextResponse.redirect(new URL("/settings/etablissement?contrat=incomplet", request.url), 303);

  const paper: TicketWidth = (TICKET_WIDTHS as readonly string[]).includes(settings.documentTicketPaper) ? (settings.documentTicketPaper as TicketWidth) : "80";
  const doc = buildPaymentTicket({
    brand: await brandFromSettings(settings),
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
  const pdf = await renderTicketPdf(doc, settings.documentTicketTheme, paper);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${payment.id.slice(-6)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
