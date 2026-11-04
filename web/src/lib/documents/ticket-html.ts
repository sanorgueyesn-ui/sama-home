// Ticket de caisse en page web imprimable : la taille du papier est portée par la page elle-même
// (@page), donc le navigateur propose tout de suite 80 mm ou 58 mm, jamais A4 pour un ticket.
// Module PUR : aucune base, aucun accès réseau. Tout texte est échappé.
import { fmtMoney, fmtNumber, fmtShortDateTime } from "./format";
import { TICKET_AMOUNT_LABELS, TICKET_TITLES } from "./ticket-themes";
import type { TicketDoc, TicketWidth } from "./types";

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Réglages de mise en page par papier : taille de la page, largeur imprimable, taille du texte, marge intérieure. */
const PAPER: Record<TicketWidth, { page: string; body: string; font: number; pad: string }> = {
  // Hauteur provisoire : le script de la page la remplace par la hauteur réelle du ticket avant l'impression
  // (la valeur « auto » n'est pas acceptée pour la hauteur d'une page).
  "58": { page: "58mm 200mm", body: "58mm", font: 10, pad: "2mm 2.5mm" },
  "80": { page: "80mm 200mm", body: "80mm", font: 12, pad: "3mm 4mm" },
  a4: { page: "A4", body: "100mm", font: 14, pad: "15mm 0" },
};

export function renderTicketHtml(doc: TicketDoc, width: TicketWidth, options: { autoPrint?: boolean } = {}): string {
  const paper = PAPER[width];
  const row = (label: string, value: string, bold = false) =>
    `<div class="r"><span class="l">${esc(label)}</span><span class="${bold ? "b " : ""}v">${esc(value)}</span></div>`;

  const contact = [doc.brand.address, [doc.brand.phone, doc.brand.secondaryPhone].filter(Boolean).join(" / "), doc.brand.email]
    .filter(Boolean)
    .map((line) => `<div class="c">${esc(String(line))}</div>`)
    .join("");
  const register = [doc.brand.ninea ? `NINEA ${doc.brand.ninea}` : null, doc.brand.rccm ? `RCCM ${doc.brand.rccm}` : null].filter(Boolean).join("  ");

  const info = [
    row("N°", doc.number ?? "Sans numéro", true),
    row("Date", fmtShortDateTime(doc.issuedAt)),
    doc.client ? row("Client", doc.client, true) : "",
    doc.property ? row("Logement", doc.property) : "",
    doc.stay ? row("Séjour", `${dayMonth(doc.stay.arrival)} au ${dayMonth(doc.stay.departure)}`) : "",
    doc.cashier ? row("Caissier", doc.cashier) : "",
  ].join("");

  const lines = doc.lines
    .map((line) => {
      const label = line.quantity && line.quantity > 1 ? `${line.quantity} x ${line.label}` : line.label;
      return `<div class="r"><span class="t">${esc(label)}</span><span class="v">${esc(fmtNumber(line.amount * (line.quantity ?? 1)))}</span></div>`;
    })
    .join("");

  const totals = [
    `<div class="r tot"><span>TOTAL</span><span>${esc(fmtMoney(doc.total))}</span></div>`,
    doc.tax ? row(`dont TVA ${doc.tax.rate} %`, fmtMoney(doc.tax.amount)) : "",
    row(TICKET_AMOUNT_LABELS[doc.kind], fmtMoney(doc.amount), true),
    doc.method ? row("Mode de paiement", doc.method) : "",
    doc.reference ? row("Référence", doc.reference) : "",
    typeof doc.remaining === "number" ? row("Reste à payer", fmtMoney(doc.remaining), doc.remaining > 0) : "",
  ].join("");

  const duplicate =
    doc.kind === "DUPLICATE"
      ? `<div class="box">${esc(doc.duplicateOf ? `COPIE DU TICKET N° ${doc.duplicateOf}` : "COPIE")} - NE VAUT PAS ORIGINAL</div>`
      : "";

  // Ticket sur rouleau : la page prend la hauteur exacte du ticket (pas de feuille blanche en dessous).
  const fit =
    width === "a4"
      ? ""
      : `function fit(){var h=Math.ceil(document.body.offsetHeight*25.4/96)+2;var s=document.createElement("style");s.textContent="@page{size:${paper.body} "+h+"mm;margin:0}";document.head.appendChild(s)}`;
  const print = options.autoPrint
    ? `window.addEventListener("load",function(){${fit ? "fit();" : ""}setTimeout(function(){window.print()},250)});window.addEventListener("afterprint",function(){setTimeout(function(){window.close()},300)});`
    : fit
      ? `window.addEventListener("load",fit);`
      : "";
  const script = fit || print ? `<script>${fit}${print}</script>` : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(TICKET_TITLES[doc.kind])}${doc.number ? ` ${esc(doc.number)}` : ""}</title>
<style>
@page{size:${paper.page};margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${paper.body};max-width:100%;margin:0 auto;padding:${paper.pad};font:${paper.font}px/1.35 "Courier New",Courier,monospace;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.h{text-align:center;font-weight:700;font-size:${paper.font + 3}px;text-transform:uppercase;margin:0 0 2px}
.c{text-align:center;font-size:${paper.font - 1.5}px}
.s{border-top:1px dashed #000;margin:6px 0}
.title{text-align:center;font-weight:700;letter-spacing:.04em;margin:2px 0}
.r{display:flex;justify-content:space-between;gap:6px;margin:1px 0}
.l{opacity:.75}
.v{text-align:right;flex:1}
.t{flex:1;overflow-wrap:anywhere}
.b{font-weight:700}
.tot{font-weight:700;font-size:${paper.font + 2}px;margin:3px 0}
.box{border:1px solid #000;padding:2px;text-align:center;font-weight:700;margin:4px 0}
.note{text-align:center;font-style:italic;margin-top:4px}
.f{text-align:center;margin-top:2px}
.end{height:4mm}
@media screen{body{margin:12px auto;box-shadow:0 0 0 1px #ddd}}
</style></head>
<body>
<div class="h">${esc(doc.brand.name)}</div>
${contact}${register ? `<div class="c">${esc(register)}</div>` : ""}
<div class="s"></div>
<div class="title">${esc(TICKET_TITLES[doc.kind])}</div>
${duplicate}
${info}
<div class="s"></div>
${lines}
<div class="s"></div>
${totals}
${doc.note ? `<div class="note">${esc(doc.note)}</div>` : ""}
<div class="s"></div>
<div class="f">Merci de votre confiance.</div>
<div class="end"></div>
${script}
</body></html>`;
}
