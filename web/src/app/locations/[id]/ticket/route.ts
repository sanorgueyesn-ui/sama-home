import { NextResponse } from "next/server";
import { loadPaymentTicket } from "@/lib/documents/ticket-payment-data";
import { renderTicketPdf } from "@/lib/documents/ticket-document";

// @react-pdf/renderer dépend de modules Node : jamais exécutable sur le runtime Edge.
export const runtime = "nodejs";

/**
 * Ticket de caisse d'un paiement d'un séjour, en PDF (hôtel uniquement : les résidences n'ont pas de ticket).
 * Seul `payment` vient de l'URL ; tout le reste vient de la base, filtré par l'établissement de la session.
 * Pour imprimer directement à la bonne taille de papier, voir ./print.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paymentId = new URL(request.url).searchParams.get("payment") ?? "";
  const result = await loadPaymentTicket(id, paymentId);
  if (result.status === "not-found") return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  if (result.status === "incomplete") return NextResponse.redirect(new URL("/settings/etablissement?contrat=incomplet", request.url), 303);

  const pdf = await renderTicketPdf(result.doc, result.themeId, result.paper);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${paymentId.slice(-6)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
