// Client PayDunya (paiement en ligne des abonnements). Documentation :
// https://developers.paydunya.com/doc/EN/http_json
//
// Règles de sécurité :
//  - les clés viennent UNIQUEMENT de l'environnement du serveur (jamais du code, dépôt public) ;
//  - un paiement n'est jamais cru sur parole : le serveur redemande l'état de la facture à PayDunya
//    (`confirmInvoice`) avant de prolonger quoi que ce soit ; le hash du message IPN n'est qu'un
//    contrôle supplémentaire ;
//  - aucun numéro de carte ni secret n'est stocké.
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export type PaydunyaMode = "test" | "live";

export type PaydunyaConfig = {
  mode: PaydunyaMode;
  masterKey: string;
  privateKey: string;
  token: string;
};

/** Configuration lue dans l'environnement ; `null` si le paiement en ligne n'est pas configuré. */
export function getPaydunyaConfig(env: Record<string, string | undefined> = process.env): PaydunyaConfig | null {
  const masterKey = env.PAYDUNYA_MASTER_KEY?.trim();
  const privateKey = env.PAYDUNYA_PRIVATE_KEY?.trim();
  const token = env.PAYDUNYA_TOKEN?.trim();
  if (!masterKey || !privateKey || !token) return null;
  const mode: PaydunyaMode = env.PAYDUNYA_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
  return { mode, masterKey, privateKey, token };
}

const BASE = {
  test: "https://app.paydunya.com/sandbox-api/v1/checkout-invoice",
  live: "https://app.paydunya.com/api/v1/checkout-invoice",
} as const;

function headers(config: PaydunyaConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

export type CreateInvoiceInput = {
  amountFcfa: number;
  description: string;
  storeName: string;
  /** Rendues par PayDunya telles quelles : URL absolues de l'application. */
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  customData: Record<string, string>;
  customer?: { name?: string; email?: string; phone?: string };
};

export async function createInvoice(
  config: PaydunyaConfig,
  input: CreateInvoiceInput,
): Promise<{ token: string; checkoutUrl: string }> {
  const response = await fetch(`${BASE[config.mode]}/create`, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify({
      invoice: {
        total_amount: input.amountFcfa,
        description: input.description,
        customer: input.customer ?? {},
      },
      store: { name: input.storeName },
      custom_data: input.customData,
      actions: { return_url: input.returnUrl, cancel_url: input.cancelUrl, callback_url: input.callbackUrl },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as
    | { response_code?: string; response_text?: string; description?: string; token?: string }
    | null;
  if (!response.ok || !body || body.response_code !== "00" || !body.token || !body.response_text) {
    throw new Error(`PayDunya : création de facture refusée (${body?.response_code ?? response.status}).`);
  }
  return { token: body.token, checkoutUrl: body.response_text };
}

export type InvoiceStatus = "completed" | "cancelled" | "failed" | "pending";

export type ConfirmedInvoice = {
  status: InvoiceStatus;
  token: string;
  totalAmountFcfa: number;
  customData: Record<string, unknown>;
  mode: string | null;
};

/** État réel d'une facture, demandé directement à PayDunya (source de vérité). */
export async function confirmInvoice(config: PaydunyaConfig, token: string): Promise<ConfirmedInvoice> {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(token)) throw new Error("PayDunya : jeton de facture invalide.");
  const response = await fetch(`${BASE[config.mode]}/confirm/${token}`, {
    method: "GET",
    headers: headers(config),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => null)) as
    | {
        response_code?: string;
        status?: string;
        mode?: string;
        invoice?: { token?: string; total_amount?: number | string };
        custom_data?: Record<string, unknown>;
      }
    | null;
  if (!response.ok || !body || body.response_code !== "00" || !body.invoice) {
    throw new Error(`PayDunya : confirmation de facture impossible (${body?.response_code ?? response.status}).`);
  }
  const status = (["completed", "cancelled", "failed", "pending"] as const).find((s) => s === body.status) ?? "pending";
  return {
    status,
    token: String(body.invoice.token ?? token),
    totalAmountFcfa: Number(body.invoice.total_amount),
    customData: body.custom_data ?? {},
    mode: body.mode ?? null,
  };
}

/** Hash attendu dans un message IPN : SHA-512 de la clé maître (documentation PayDunya). */
export function expectedIpnHash(masterKey: string): string {
  return createHash("sha512").update(masterKey).digest("hex");
}

/** Comparaison à temps constant du hash reçu. Contrôle SUPPLÉMENTAIRE : la confirmation reste faite par `confirmInvoice`. */
export function isValidIpnHash(received: unknown, masterKey: string): boolean {
  if (typeof received !== "string") return false;
  const a = Buffer.from(received.toLowerCase());
  const b = Buffer.from(expectedIpnHash(masterKey));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Le message IPN arrive en `application/x-www-form-urlencoded` avec des clés imbriquées `data[invoice][token]`. */
export function readIpnToken(form: FormData): { token: string | null; hash: string | null } {
  const token = form.get("data[invoice][token]");
  const hash = form.get("data[hash]");
  return { token: typeof token === "string" ? token : null, hash: typeof hash === "string" ? hash : null };
}
