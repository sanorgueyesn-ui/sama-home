// Ticket de caisse en PDF (hôtel) : un contenu (TicketDoc) mis en page par l'une des 10 présentations
// (ticket-themes), sur papier thermique de 58 ou 80 mm, ou sur une page A4. Les montants viennent du
// document, jamais recalculés ici.
import QRCode from "qrcode";
import { Document, Image as PdfImage, Page, Path, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { fmtMoney, fmtNumber, fmtShortDateTime } from "./format";
import { pdfPalette, type PdfPalette } from "./palette";
import {
  TICKET_AMOUNT_LABELS,
  TICKET_PAPER,
  TICKET_THEMES,
  TICKET_TITLES,
  type TicketTheme,
} from "./ticket-themes";
import type { DocumentBrand, TicketDoc, TicketWidth } from "./types";

function fonts(theme: TicketTheme) {
  if (theme.font === "mono") return { regular: "Courier", bold: "Courier-Bold", italic: "Courier-Oblique" };
  if (theme.font === "serif") return { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" };
  return { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
}

const stayLabel = (doc: TicketDoc) => {
  if (!doc.stay) return null;
  const day = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${day(doc.stay.arrival)} au ${day(doc.stay.departure)}`;
};

const contactLines = (brand: DocumentBrand): string[] => {
  const lines = [brand.address, [brand.phone, brand.secondaryPhone].filter(Boolean).join(" / ")];
  if (brand.email) lines.push(brand.email);
  const register = [brand.ninea ? `NINEA ${brand.ninea}` : null, brand.rccm ? `RCCM ${brand.rccm}` : null].filter(Boolean).join("  ");
  if (register) lines.push(register);
  return lines.filter(Boolean);
};

type Ctx = { doc: TicketDoc; theme: TicketTheme; p: PdfPalette; size: number; width: number };

function Separator({ ctx }: { ctx: Ctx }) {
  const { theme, p } = ctx;
  switch (theme.separator) {
    case "dashed":
      return <View style={{ marginVertical: 4, borderTopWidth: 0.8, borderTopColor: p.ink, borderStyle: "dashed" }} />;
    case "dotted":
      return <View style={{ marginVertical: 4, borderTopWidth: 0.9, borderTopColor: p.ink, borderStyle: "dotted" }} />;
    case "solid":
      return <View style={{ marginVertical: 4, borderTopWidth: 0.7, borderTopColor: p.ink }} />;
    case "double":
      return (
        <View style={{ marginVertical: 4 }}>
          <View style={{ borderTopWidth: 1, borderTopColor: p.ink }} />
          <View style={{ marginTop: 1.5, borderTopWidth: 0.4, borderTopColor: p.ink }} />
        </View>
      );
    case "thick":
      return <View style={{ marginVertical: 4, borderTopWidth: 2.2, borderTopColor: p.ink }} />;
    case "none":
      return <View style={{ height: 5 }} />;
  }
}

function Header({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const { brand } = doc;
  const f = fonts(theme);
  const contact = contactLines(brand);
  const logo = (box: number) => (brand.logo ? <PdfImage src={{ data: brand.logo.data, format: brand.logo.format }} style={{ width: box, height: box, objectFit: "contain", alignSelf: "center" }} /> : null);
  const contactText = (color: string, opacity = 1) =>
    contact.map((line, index) => (
      <Text key={index} style={{ fontFamily: f.regular, fontSize: size - 1.2, color, opacity, textAlign: "center" }}>
        {line}
      </Text>
    ));

  switch (theme.header) {
    case "plain":
      return (
        <View style={{ alignItems: "center", marginBottom: 3 }}>
          {logo(size * 3.4)}
          <Text style={{ fontFamily: f.bold, fontSize: size + 3, textAlign: "center", marginTop: 2, textTransform: "uppercase" }}>{brand.name}</Text>
          {contactText(p.ink)}
        </View>
      );
    case "inverted":
      return (
        <View style={{ backgroundColor: p.primary, padding: 7, alignItems: "center", marginBottom: 3 }}>
          {brand.logo ? <View style={{ backgroundColor: "#FFFFFF", padding: 2, borderRadius: 3, marginBottom: 2 }}>{logo(size * 2.8)}</View> : null}
          <Text style={{ fontFamily: f.bold, fontSize: size + 3, color: p.onPrimary, textAlign: "center", textTransform: "uppercase" }}>{brand.name}</Text>
          {contactText(p.onPrimary, 0.9)}
        </View>
      );
    case "boxed":
      return (
        <View style={{ alignItems: "center", marginBottom: 3 }}>
          <View style={{ borderWidth: 1.2, borderColor: p.ink, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 3 }}>
            <Text style={{ fontFamily: f.bold, fontSize: size + 2.5, textAlign: "center", textTransform: "uppercase" }}>{brand.name}</Text>
          </View>
          {contactText(p.ink)}
        </View>
      );
    case "accent":
      return (
        <View style={{ marginBottom: 3 }}>
          <View style={{ backgroundColor: p.accent, padding: 7, alignItems: "center" }}>
            <Text style={{ fontFamily: f.bold, fontSize: size + 3.5, color: p.onAccent, textAlign: "center", textTransform: "uppercase" }}>{brand.name}</Text>
            {contactText(p.onAccent, 0.9)}
          </View>
          <View style={{ backgroundColor: p.ink, paddingVertical: 3.5, alignItems: "center" }}>
            <Text style={{ fontFamily: f.bold, fontSize: size + 0.5, color: "#FFFFFF", letterSpacing: 1.2 }}>{TICKET_TITLES[doc.kind]}</Text>
          </View>
        </View>
      );
    case "compact":
      return (
        <View style={{ marginBottom: 2 }}>
          <Text style={{ fontFamily: f.bold, fontSize: size + 1.5, textTransform: "uppercase" }}>{brand.name}</Text>
          <Text style={{ fontFamily: f.regular, fontSize: size - 1.4, color: p.muted }}>{[brand.address, brand.phone].filter(Boolean).join("  |  ")}</Text>
        </View>
      );
    case "ornate":
      return (
        <View style={{ alignItems: "center", marginBottom: 3 }}>
          {logo(size * 3)}
          <Text style={{ fontFamily: f.bold, fontSize: size + 2.5, textAlign: "center", textTransform: "uppercase", letterSpacing: 2, marginTop: 2 }}>{brand.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginVertical: 3 }}>
            <View style={{ width: 28, borderTopWidth: 0.6, borderTopColor: p.ink }} />
            <View style={{ width: 4, height: 4, backgroundColor: p.ink, transform: "rotate(45deg)" }} />
            <View style={{ width: 28, borderTopWidth: 0.6, borderTopColor: p.ink }} />
          </View>
          {contact.map((line, index) => (
            <Text key={index} style={{ fontFamily: f.italic, fontSize: size - 1.2, textAlign: "center" }}>
              {line}
            </Text>
          ))}
        </View>
      );
  }
}

function Row({ ctx, label, value, bold = false, size }: { ctx: Ctx; label: string; value: string; bold?: boolean; size?: number }) {
  const f = fonts(ctx.theme);
  const fontSize = size ?? ctx.size;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 1.5 }}>
      <Text style={{ fontFamily: f.regular, fontSize, color: ctx.p.muted }}>{label}</Text>
      <Text style={{ fontFamily: bold ? f.bold : f.regular, fontSize, textAlign: "right", flex: 1 }}>{value}</Text>
    </View>
  );
}

function InfoBlock({ ctx }: { ctx: Ctx }) {
  const { doc, theme } = ctx;
  const compact = theme.lines === "compact";
  return (
    <View style={{ marginVertical: 2 }}>
      <Row ctx={ctx} label="N°" value={doc.number ?? (doc.sample ? "Aperçu" : "Sans numéro")} bold />
      <Row ctx={ctx} label="Date" value={fmtShortDateTime(doc.issuedAt)} />
      {doc.client ? <Row ctx={ctx} label="Client" value={doc.client} bold /> : null}
      {doc.property ? <Row ctx={ctx} label="Logement" value={doc.property} /> : null}
      {!compact && doc.stay ? <Row ctx={ctx} label="Séjour" value={stayLabel(doc) ?? ""} /> : null}
      {!compact && doc.cashier ? <Row ctx={ctx} label="Caissier" value={doc.cashier} /> : null}
    </View>
  );
}

function Lines({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const f = fonts(theme);
  if (doc.lines.length === 0) return null;
  const label = (line: TicketDoc["lines"][number]) => (line.quantity && line.quantity > 1 ? `${line.quantity} x ${line.label}` : line.label);

  if (theme.lines === "table") {
    return (
      <View style={{ marginVertical: 2 }}>
        <View style={{ flexDirection: "row", borderBottomWidth: 0.7, borderBottomColor: p.ink, paddingBottom: 1.5, marginBottom: 2 }}>
          <Text style={{ flex: 1, fontFamily: f.bold, fontSize: size - 1.2, textTransform: "uppercase" }}>Désignation</Text>
          <Text style={{ fontFamily: f.bold, fontSize: size - 1.2, textTransform: "uppercase" }}>Montant</Text>
        </View>
        {doc.lines.map((line, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 6, paddingVertical: 1.5, borderBottomWidth: 0.3, borderBottomColor: p.line }}>
            <Text style={{ flex: 1, fontFamily: f.regular, fontSize: size }}>{label(line)}</Text>
            <Text style={{ fontFamily: f.bold, fontSize: size }}>{fmtNumber(line.amount * (line.quantity ?? 1))}</Text>
          </View>
        ))}
      </View>
    );
  }
  const small = theme.lines === "compact";
  return (
    <View style={{ marginVertical: 2 }}>
      {doc.lines.map((line, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 6, marginBottom: small ? 0.5 : 1.5 }}>
          <Text style={{ flex: 1, fontFamily: f.regular, fontSize: small ? size - 0.6 : size }}>{label(line)}</Text>
          <Text style={{ fontFamily: f.regular, fontSize: small ? size - 0.6 : size }}>{fmtNumber(line.amount * (line.quantity ?? 1))}</Text>
        </View>
      ))}
    </View>
  );
}

function Totals({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const f = fonts(theme);
  const amountLabel = TICKET_AMOUNT_LABELS[doc.kind];
  const totalRow = (fontSize: number, color = p.ink) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text style={{ fontFamily: f.bold, fontSize, color }}>TOTAL</Text>
      <Text style={{ fontFamily: f.bold, fontSize, color }}>{fmtMoney(doc.total)}</Text>
    </View>
  );

  let total;
  switch (theme.total) {
    case "line":
      total = <View style={{ marginVertical: 2 }}>{totalRow(size + 1)}</View>;
      break;
    case "big":
      total = <View style={{ marginVertical: 3 }}>{totalRow(size + 4)}</View>;
      break;
    case "boxed":
      total = <View style={{ marginVertical: 3, borderWidth: 1, borderColor: p.ink, padding: 4 }}>{totalRow(size + 2)}</View>;
      break;
    case "inverted":
      total = <View style={{ marginVertical: 3, backgroundColor: p.ink, padding: 5 }}>{totalRow(size + 2.5, "#FFFFFF")}</View>;
      break;
    case "hero":
      total = (
        <View style={{ alignItems: "center", marginVertical: 5 }}>
          <Text style={{ fontFamily: f.bold, fontSize: size - 0.5, letterSpacing: 1.2, textTransform: "uppercase" }}>{amountLabel}</Text>
          <Text style={{ fontFamily: f.bold, fontSize: size + 17, marginTop: 1 }}>{fmtNumber(doc.amount)}</Text>
          <Text style={{ fontFamily: f.bold, fontSize: size + 1, letterSpacing: 2 }}>FCFA</Text>
          <Text style={{ fontFamily: f.regular, fontSize: size - 0.5, color: p.muted, marginTop: 3 }}>Total du séjour : {fmtMoney(doc.total)}</Text>
        </View>
      );
      break;
  }

  return (
    <View>
      {total}
      {doc.tax ? <Row ctx={ctx} label={`dont TVA ${doc.tax.rate} %`} value={fmtMoney(doc.tax.amount)} /> : null}
      {theme.total === "hero" ? null : <Row ctx={ctx} label={amountLabel} value={fmtMoney(doc.amount)} bold size={size + 0.5} />}
      {doc.method ? <Row ctx={ctx} label="Mode de paiement" value={doc.method} /> : null}
      {doc.reference ? <Row ctx={ctx} label="Référence" value={doc.reference} /> : null}
      {typeof doc.remaining === "number" ? (
        <Row ctx={ctx} label="Reste à payer" value={fmtMoney(doc.remaining)} bold={doc.remaining > 0} />
      ) : null}
    </View>
  );
}

function QrBlock({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const f = fonts(theme);
  const text = `REF:${doc.number ?? "SANS-NUMERO"}|${doc.amount}|${doc.issuedAt.toISOString().slice(0, 10)}`;
  const { size: modules, data } = QRCode.create(text, { errorCorrectionLevel: "M" }).modules;
  const margin = 2;
  let path = "";
  for (let y = 0; y < modules; y++) for (let x = 0; x < modules; x++) if (data[y * modules + x]) path += `M${x + margin},${y + margin}h1v1h-1z`;
  const view = modules + margin * 2;
  const box = size * 7;
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <Svg viewBox={`0 0 ${view} ${view}`} style={{ width: box, height: box }}>
        <Path d={path} fill={p.ink} />
      </Svg>
      <Text style={{ fontFamily: f.regular, fontSize: size - 1.4, color: p.muted, marginTop: 2 }}>{doc.number ? `Réf. ${doc.number}` : doc.sample ? "Aperçu" : "Sans numéro"}</Text>
      <View style={{ width: "88%", marginTop: size * 3, borderTopWidth: 0.7, borderTopColor: p.ink }} />
      <Text style={{ fontFamily: f.regular, fontSize: size - 1.4, color: p.muted, marginTop: 1.5 }}>Signature du client</Text>
    </View>
  );
}

function StubBlock({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const f = fonts(theme);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ borderTopWidth: 0.9, borderTopColor: p.ink, borderStyle: "dashed", marginBottom: 2 }} />
      <Text style={{ fontFamily: f.regular, fontSize: size - 1.6, color: p.muted, textAlign: "center", letterSpacing: 1 }}>- - -  A DÉTACHER  - - -</Text>
      <View style={{ marginTop: 4, borderWidth: 0.7, borderColor: p.ink, padding: 5 }}>
        <Text style={{ fontFamily: f.bold, fontSize: size - 0.5, textTransform: "uppercase", textAlign: "center" }}>Talon — {doc.brand.name}</Text>
        <Row ctx={ctx} label="N°" value={doc.number ?? (doc.sample ? "Aperçu" : "Sans numéro")} bold />
        <Row ctx={ctx} label="Date" value={fmtShortDateTime(doc.issuedAt)} />
        {doc.client ? <Row ctx={ctx} label="Client" value={doc.client} /> : null}
        <Row ctx={ctx} label={TICKET_AMOUNT_LABELS[doc.kind]} value={fmtMoney(doc.amount)} bold />
      </View>
    </View>
  );
}

function TicketBody({ ctx }: { ctx: Ctx }) {
  const { doc, theme, p, size } = ctx;
  const f = fonts(theme);
  const showTitle = theme.header !== "accent";
  return (
    <View style={theme.frame ? { borderWidth: 1, borderColor: p.ink, padding: 7 } : undefined}>
      <Header ctx={ctx} />
      <Separator ctx={ctx} />
      {showTitle ? (
        <Text style={{ fontFamily: f.bold, fontSize: size + 1.5, textAlign: theme.header === "compact" ? "left" : "center", letterSpacing: 0.6, marginVertical: 2 }}>{TICKET_TITLES[doc.kind]}</Text>
      ) : null}
      {doc.kind === "DUPLICATE" ? (
        <View style={{ borderWidth: 1, borderColor: p.ink, padding: 3, marginVertical: 3 }}>
          <Text style={{ fontFamily: f.bold, fontSize: size - 0.5, textAlign: "center" }}>
            {doc.duplicateOf ? `COPIE DU TICKET N° ${doc.duplicateOf}` : "COPIE"} — NE VAUT PAS ORIGINAL
          </Text>
        </View>
      ) : null}
      <InfoBlock ctx={ctx} />
      <Separator ctx={ctx} />
      <Lines ctx={ctx} />
      <Separator ctx={ctx} />
      <Totals ctx={ctx} />
      {doc.note ? <Text style={{ fontFamily: f.italic, fontSize: size - 0.8, color: p.muted, marginTop: 4, textAlign: "center" }}>{doc.note}</Text> : null}
      {theme.qr ? <QrBlock ctx={ctx} /> : null}
      <Separator ctx={ctx} />
      <Text style={{ fontFamily: f.regular, fontSize: size - 0.4, textAlign: "center", marginTop: 1 }}>Merci de votre confiance.</Text>
      {doc.sample ? <Text style={{ fontFamily: f.bold, fontSize: size - 1.8, textAlign: "center", marginTop: 3, color: p.secondary, letterSpacing: 0.4 }}>EXEMPLE — SANS VALEUR</Text> : null}
      {theme.stub ? <StubBlock ctx={ctx} /> : null}
    </View>
  );
}

/** Hauteur de papier estimée en points, pour ne pas dérouler un rouleau entier. À calibrer sur l'imprimante réelle. */
export function estimateTicketHeight(doc: TicketDoc, theme: TicketTheme, width: TicketWidth): number {
  const paper = TICKET_PAPER[width];
  const size = (theme.font === "mono" ? 7.4 : 8) * paper.scale;
  const contentWidth = width === "a4" ? 300 : paper.widthPt - paper.padding * 2;
  const charWidth = size * (theme.font === "mono" ? 0.6 : 0.52);
  const cpl = Math.max(10, Math.floor(contentWidth / charWidth));
  const lh = size * 1.4;
  const wrap = (text: string, perLine = cpl) => Math.max(1, Math.ceil(text.length / perLine));

  let h = 0;
  h += (doc.brand.logo ? size * 3.4 + 4 : 0) + wrap(doc.brand.name, Math.floor(cpl * 0.8)) * (size + 5) * 1.3;
  h += contactLines(doc.brand).reduce((sum, line) => sum + wrap(line) * lh * 0.9, 0);
  h += theme.header === "inverted" || theme.header === "accent" || theme.header === "boxed" ? 26 : 8;
  h += 26 + 4 * 9; // titre et séparateurs
  if (doc.kind === "DUPLICATE") h += lh * 2 + 10;
  h += lh * (2 + (doc.client ? 1 : 0) + (doc.property ? 1 : 0) + (doc.stay && theme.lines !== "compact" ? 1 : 0) + (doc.cashier && theme.lines !== "compact" ? 1 : 0));
  h += (theme.lines === "table" ? lh + 6 : 0) + doc.lines.reduce((sum, line) => sum + wrap(line.label, cpl - 10) * lh + 3, 0);
  const totalBlock: Record<TicketTheme["total"], number> = { line: lh * 2 + 8, big: lh * 2.4 + 14, boxed: lh * 2.2 + 16, inverted: lh * 2.2 + 14, hero: (size + 17) * 1.5 + lh * 3 + 14 };
  h += totalBlock[theme.total];
  h += lh * (2 + (doc.method ? 1 : 0) + (doc.reference ? 1 : 0) + (typeof doc.remaining === "number" ? 1 : 0) + (doc.tax ? 1 : 0));
  if (doc.note) h += wrap(doc.note) * lh + 8;
  if (theme.qr) h += size * 7 + size * 3 + lh * 3 + 14;
  if (theme.stub) h += lh * 7 + 34;
  if (doc.sample) h += lh;
  h += lh * 2 + 12;
  if (theme.frame) h += 18;
  return Math.max(220, Math.ceil((h + paper.padding * 2 + 16) * 0.85));
}

export function TicketPdf({ doc, theme, width }: { doc: TicketDoc; theme: TicketTheme; width: TicketWidth }) {
  const p = pdfPalette(doc.brand.colors);
  const paper = TICKET_PAPER[width];
  const size = (theme.font === "mono" ? 7.4 : 8) * paper.scale;
  const f = fonts(theme);
  const contentWidth = width === "a4" ? 300 : paper.widthPt - paper.padding * 2;
  const ctx: Ctx = { doc, theme, p, size, width: contentWidth };
  const title = `${TICKET_TITLES[doc.kind]}${doc.number ? ` ${doc.number}` : ""}`;

  return (
    <Document title={title} author={doc.brand.name}>
      {width === "a4" ? (
        <Page size="A4" style={{ fontFamily: f.regular, fontSize: size, color: p.ink, padding: 40, backgroundColor: "#FFFFFF" }}>
          <View style={{ width: contentWidth, alignSelf: "center" }}>
            <TicketBody ctx={ctx} />
          </View>
        </Page>
      ) : (
        <Page
          size={[paper.widthPt, estimateTicketHeight(doc, theme, width)]}
          style={{ fontFamily: f.regular, fontSize: size, color: p.ink, padding: paper.padding, backgroundColor: "#FFFFFF" }}
        >
          <TicketBody ctx={ctx} />
        </Page>
      )}
    </Document>
  );
}

export async function renderTicketPdf(doc: TicketDoc, themeId: number, width: TicketWidth): Promise<Buffer> {
  const theme = TICKET_THEMES.find((candidate) => candidate.id === themeId) ?? TICKET_THEMES[0];
  return renderToBuffer(<TicketPdf doc={doc} theme={theme} width={width} />);
}
