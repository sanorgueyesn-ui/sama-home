import { NextResponse } from "next/server";
import { getPaydunyaConfig, isValidIpnHash, readIpnToken } from "@/lib/paydunya";
import { settlePaydunyaPayment } from "@/lib/subscription-online";

// Message automatique de PayDunya (IPN). Public par nature (hors du proxy d'authentification) : il ne
// décide de rien. Le hash est vérifié, puis l'état RÉEL de la facture est redemandé à PayDunya avant
// toute prolongation. Un message forgé, rejoué ou en double ne peut donc ni prolonger ni prolonger deux fois.
export async function POST(request: Request) {
  const config = getPaydunyaConfig();
  if (!config) return NextResponse.json({ ok: false }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { token, hash } = readIpnToken(form);
  if (!token || !isValidIpnHash(hash, config.masterKey)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await settlePaydunyaPayment(token);
    if (result.state === "REJECTED") console.error(`PayDunya IPN — facture refusée (${result.reason}), jeton ${token}`);
    return NextResponse.json({ ok: true, state: result.state });
  } catch (error) {
    console.error("PayDunya IPN — échec du traitement :", error);
    return NextResponse.json({ ok: false }, { status: 500 }); // PayDunya pourra réessayer
  }
}
