// Paramètres d'un aperçu de document (venus de l'URL, donc du navigateur) : tout est validé contre une
// liste blanche avant d'être utilisé. Module PUR. Un paramètre inconnu est une erreur, jamais une valeur
// par défaut silencieuse.
import { CONTRACT_THEMES } from "./contract-themes";
import { TICKET_THEMES } from "./ticket-themes";
import type { ContractKind, TicketKind, TicketWidth } from "./types";

export const CONTRACT_KINDS: readonly ContractKind[] = ["HOTEL_STAY", "LEASE_3Y", "LEASE_OPEN"];
export const TICKET_KINDS: readonly TicketKind[] = ["ARRHES", "PAYMENT", "BALANCE", "DEPOSIT", "DEPOSIT_REFUND", "EXTRAS", "STAY_SUMMARY", "DUPLICATE"];
export const TICKET_WIDTHS: readonly TicketWidth[] = ["58", "80", "a4"];

export type PreviewRequest =
  | { family: "contract"; theme: number; kind: ContractKind }
  | { family: "quittance"; theme: number; partial: boolean }
  | { family: "ticket"; theme: number; kind: TicketKind; width: TicketWidth };

export type PreviewParse = { ok: true; value: PreviewRequest } | { ok: false; error: string };

export function parsePreviewParams(params: URLSearchParams): PreviewParse {
  const family = params.get("family");
  const themeRaw = params.get("theme");
  const theme = themeRaw !== null && /^\d{1,2}$/.test(themeRaw) ? Number(themeRaw) : NaN;

  if (family === "contract" || family === "quittance") {
    if (!CONTRACT_THEMES.some((candidate) => candidate.id === theme)) return { ok: false, error: "Présentation inconnue." };
    if (family === "quittance") return { ok: true, value: { family, theme, partial: params.get("partial") === "1" } };
    const kind = params.get("kind") ?? "LEASE_3Y";
    if (!(CONTRACT_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Type de contrat inconnu." };
    return { ok: true, value: { family, theme, kind: kind as ContractKind } };
  }

  if (family === "ticket") {
    if (!TICKET_THEMES.some((candidate) => candidate.id === theme)) return { ok: false, error: "Présentation inconnue." };
    const kind = params.get("kind") ?? "PAYMENT";
    if (!(TICKET_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Type de ticket inconnu." };
    const width = params.get("width") ?? "80";
    if (!(TICKET_WIDTHS as readonly string[]).includes(width)) return { ok: false, error: "Largeur de papier inconnue." };
    return { ok: true, value: { family, theme, kind: kind as TicketKind, width: width as TicketWidth } };
  }

  return { ok: false, error: "Famille de document inconnue." };
}
