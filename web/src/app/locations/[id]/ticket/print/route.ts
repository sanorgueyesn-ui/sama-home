import { NextResponse } from "next/server";
import { loadPaymentTicket } from "@/lib/documents/ticket-payment-data";
import { renderTicketHtml } from "@/lib/documents/ticket-html";

export const runtime = "nodejs";

/**
 * Ticket de caisse imprimable : une page web dont la taille de papier (80 ou 58 mm, selon les paramètres de
 * l'établissement) est déclarée dans la page, pour que l'impression se règle toute seule. La fenêtre
 * d'impression s'ouvre automatiquement (sauf avec ?preview=1).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const result = await loadPaymentTicket(id, url.searchParams.get("payment") ?? "");
  if (result.status === "not-found") return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  if (result.status === "incomplete") return NextResponse.redirect(new URL("/settings/etablissement?contrat=incomplet", request.url), 303);

  return new NextResponse(renderTicketHtml(result.doc, result.paper, { autoPrint: url.searchParams.get("preview") !== "1" }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
