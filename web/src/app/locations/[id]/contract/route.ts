import { NextResponse } from "next/server";
import { getRentalContractData } from "@/lib/contract-data";
import { renderRentalContractPdf } from "@/lib/contract-pdf";

// @react-pdf/renderer dépend de modules Node (fs/buffer) — jamais exécutable
// sur le runtime Edge.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRentalContractData(id);
  if (!data) {
    return NextResponse.json({ error: "Location introuvable." }, { status: 404 });
  }
  // Coordonnées de l'établissement incomplètes : pas de contrat avec des coordonnées inventées. On
  // renvoie vers la page où les renseigner, qui explique pourquoi.
  if ("missing" in data) {
    return NextResponse.redirect(new URL("/settings/etablissement?contrat=incomplet", request.url), 303);
  }

  const pdf = await renderRentalContractPdf({
    rental: data.rental,
    settings: data.settings,
    summary: data.summary,
    logoImage: data.logoImage,
    brandColors: data.brandColors,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrat-location-${id}.pdf"`,
    },
  });
}
