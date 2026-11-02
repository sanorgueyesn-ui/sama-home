import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { renderContractPdf } from "@/lib/documents/contract-document";
import { parsePreviewParams } from "@/lib/documents/preview-params";
import { getPreviewBrand } from "@/lib/documents/preview-data";
import { renderQuittancePdf } from "@/lib/documents/quittance-document";
import { sampleContract, sampleQuittance, sampleTicket } from "@/lib/documents/samples";
import { renderTicketPdf } from "@/lib/documents/ticket-document";

// @react-pdf/renderer dépend de modules Node : jamais exécutable sur le runtime Edge.
export const runtime = "nodejs";

/**
 * Aperçu d'un modèle de document avec des données d'EXEMPLE. Réservé à l'administrateur de l'espace actif
 * (la session impose l'espace ; seule la marque de cet espace est lue). Rien n'est écrit : ni base, ni
 * stockage. Tous les paramètres viennent de l'URL et sont validés contre une liste blanche.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Réservé à l'administrateur." }, { status: 403 });
  }

  const parsed = parsePreviewParams(new URL(request.url).searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const req = parsed.value;

  const brand = await getPreviewBrand();
  let pdf: Buffer;
  if (req.family === "contract") pdf = await renderContractPdf(sampleContract(req.kind, brand), req.theme);
  else if (req.family === "quittance") pdf = await renderQuittancePdf(sampleQuittance(brand, req.partial), req.theme);
  else pdf = await renderTicketPdf(sampleTicket(req.kind, brand), req.theme, req.width);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="apercu-${req.family}-${req.theme}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
