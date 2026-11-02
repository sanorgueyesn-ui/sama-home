// Choix de la présentation des documents par établissement : validation pure, aucune base. Ce qui vient
// du navigateur n'est jamais cru : numéro de présentation et largeur de papier sont revérifiés.
import { CONTRACT_THEMES } from "./contract-themes";
import { TICKET_THEMES } from "./ticket-themes";
import { TICKET_WIDTHS } from "./preview-params";
import type { TicketWidth } from "./types";

export type DocumentSelection =
  | { kind: "contract"; theme: number }
  | { kind: "ticket"; theme: number; paper: TicketWidth };

export type SelectionParse = { ok: true; value: DocumentSelection } | { ok: false; error: string };

export function parseDocumentSelection(input: { kind: unknown; theme: unknown; paper?: unknown }): SelectionParse {
  const raw = typeof input.theme === "number" ? String(input.theme) : typeof input.theme === "string" ? input.theme : "";
  if (!/^\d{1,2}$/.test(raw)) return { ok: false, error: "Présentation inconnue." };
  const theme = Number(raw);

  if (input.kind === "contract") {
    if (!CONTRACT_THEMES.some((candidate) => candidate.id === theme)) return { ok: false, error: "Présentation inconnue." };
    return { ok: true, value: { kind: "contract", theme } };
  }
  if (input.kind === "ticket") {
    if (!TICKET_THEMES.some((candidate) => candidate.id === theme)) return { ok: false, error: "Présentation inconnue." };
    const paper = typeof input.paper === "string" ? input.paper : "";
    if (!(TICKET_WIDTHS as readonly string[]).includes(paper)) return { ok: false, error: "Largeur de papier inconnue." };
    return { ok: true, value: { kind: "ticket", theme, paper: paper as TicketWidth } };
  }
  return { ok: false, error: "Type de document inconnu." };
}
