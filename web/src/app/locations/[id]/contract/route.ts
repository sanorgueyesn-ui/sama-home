import { NextResponse } from "next/server";
import { getRentalContractData } from "@/lib/contract-data";
import { renderRentalContractPdf } from "@/lib/contract-pdf";

// @react-pdf/renderer dépend de modules Node (fs/buffer) — jamais exécutable
// sur le runtime Edge.
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRentalContractData(id);
  if (!data) {
    return NextResponse.json({ error: "Location introuvable." }, { status: 404 });
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
