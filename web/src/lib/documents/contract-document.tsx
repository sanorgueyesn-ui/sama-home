// Contrat de location en PDF : un contenu (contract-clauses) mis en page par l'un des 10 habillages
// (contract-themes). Le texte du contrat ne dépend JAMAIS de l'habillage.
import { Document, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { buildContractArticles, contractTitle } from "./contract-clauses";
import { CONTRACT_THEMES, type ContractTheme } from "./contract-themes";
import { DocumentShell, fontsFor } from "./document-shell";
import { fmtDate, fmtMoney } from "./format";
import { pdfPalette, type PdfPalette } from "./palette";
import type { ContractArticle, ContractDoc } from "./types";

type Row = [label: string, value: string];

/** Habillage à colonne latérale : seuls les premiers articles tiennent à côté d'elle sur la première page. */
const SIDEBAR_ROW_ARTICLES = 5;

function partyRows(doc: ContractDoc) {
  const hotel = doc.kind === "HOTEL_STAY";
  const { brand, tenant } = doc;
  const register = [brand.ninea ? `NINEA ${brand.ninea}` : null, brand.rccm ? `RCCM ${brand.rccm}` : null].filter(Boolean).join("  ");
  const lessor: Row[] = [
    ["Nom", brand.name],
    ["Adresse", brand.address],
    ["Téléphone", [brand.phone, brand.secondaryPhone].filter(Boolean).join(" / ")],
  ];
  if (brand.email) lessor.push(["Email", brand.email]);
  if (register) lessor.push(["Immatriculation", register]);
  const tenantRows: Row[] = [
    ["Nom", tenant.name],
    ["Téléphone", tenant.phone],
  ];
  if (tenant.email) tenantRows.push(["Email", tenant.email]);
  if (tenant.address) tenantRows.push(["Adresse", tenant.address]);
  if (tenant.nationality) tenantRows.push(["Nationalité", tenant.nationality]);
  tenantRows.push(["Pièce d'identité", tenant.idNumber ? `${tenant.idType ?? "Pièce"} n° ${tenant.idNumber}` : "À présenter à l'arrivée"]);
  return {
    lessorTitle: hotel ? "L'établissement" : "Le bailleur",
    tenantTitle: hotel ? "Le client" : "Le locataire",
    lessor,
    tenant: tenantRows,
  };
}

function keyFacts(doc: ContractDoc): Row[] {
  const hotel = doc.kind === "HOTEL_STAY";
  const { money, period, property } = doc;
  const facts: Row[] = [
    ["Logement", `${property.typeLabel} ${property.name}`],
    ["Début", fmtDate(period.start)],
  ];
  if (period.end) facts.push(["Fin", fmtDate(period.end)]);
  facts.push([hotel ? "Prix du séjour" : "Loyer mensuel", fmtMoney(money.amount)]);
  if (money.deposit > 0) facts.push([hotel ? "Acompte" : "Dépôt de garantie", fmtMoney(money.deposit)]);
  if (hotel) {
    facts.push(["Déjà versé", fmtMoney(money.paid)]);
    facts.push(["Reste à payer", fmtMoney(money.remaining)]);
  }
  return facts;
}

function Lines({ rows, palette: p, theme, size = 9 }: { rows: Row[]; palette: PdfPalette; theme: ContractTheme; size?: number }) {
  const f = fontsFor(theme);
  return (
    <View style={{ gap: 2 }}>
      {rows.map(([label, value]) => (
        <View key={label} style={{ flexDirection: "row", gap: 4 }}>
          <Text style={{ fontFamily: f.regular, fontSize: size - 0.8, lineHeight: 1.3, color: p.muted, width: 62 }}>{label}</Text>
          <Text style={{ fontFamily: label === "Nom" ? f.bold : f.regular, fontSize: size, lineHeight: 1.3, color: p.ink, flex: 1 }}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Parties({ doc, theme, palette: p }: { doc: ContractDoc; theme: ContractTheme; palette: PdfPalette }) {
  const f = fontsFor(theme);
  const data = partyRows(doc);
  const heading = (text: string, extra: object = {}) => (
    <Text style={{ fontFamily: f.bold, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: p.primary, marginBottom: 5, ...extra }}>{text}</Text>
  );
  const intro = <Text style={{ fontFamily: f.italic, fontSize: 9, color: p.muted, marginBottom: 6 }}>Entre les soussignés :</Text>;

  const two = (wrapStyle: (side: "left" | "right") => object, headStyle?: object) => (
    <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }} wrap={false}>
      {(["left", "right"] as const).map((side) => {
        const rows = side === "left" ? data.lessor : data.tenant;
        const title = side === "left" ? data.lessorTitle : data.tenantTitle;
        return (
          <View key={side} style={{ flex: 1, ...wrapStyle(side) }}>
            {heading(title, headStyle)}
            <Lines rows={rows} palette={p} theme={theme} />
          </View>
        );
      })}
    </View>
  );

  let body;
  switch (theme.parties) {
    case "columns":
      body = two(() => ({}));
      break;
    case "divided":
      body = two((side) => (side === "right" ? { paddingLeft: 14, borderLeftWidth: 0.6, borderLeftColor: p.line } : {}));
      break;
    case "cards":
      body = two(() => ({ backgroundColor: p.tint, borderRadius: 6, padding: 10, borderLeftWidth: 3, borderLeftColor: p.accent }));
      break;
    case "boxes":
      body = two(() => ({ borderWidth: 0.8, borderColor: p.primary, padding: 9 }));
      break;
    case "soft":
      body = two(() => ({ backgroundColor: p.tint, borderRadius: 12, padding: 11 }));
      break;
    case "table": {
      const hotel = doc.kind === "HOTEL_STAY";
      const labels = ["Nom", "Adresse", "Téléphone", "Email", "Pièce d'identité"] as const;
      const get = (rows: Row[], label: string) => rows.find(([l]) => l === label)?.[1] ?? "";
      body = (
        <View style={{ marginBottom: 14, borderWidth: 0.6, borderColor: p.line }} wrap={false}>
          <View style={{ flexDirection: "row", backgroundColor: p.tint }}>
            <Text style={{ width: 84, padding: 4, fontFamily: f.bold, fontSize: 7.5, color: p.muted }}> </Text>
            <Text style={{ flex: 1, padding: 4, fontFamily: f.bold, fontSize: 8, color: p.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>{data.lessorTitle}</Text>
            <Text style={{ flex: 1, padding: 4, fontFamily: f.bold, fontSize: 8, color: p.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>{data.tenantTitle}</Text>
          </View>
          {labels.map((label) => {
            const left = label === "Pièce d'identité" ? get(data.lessor, "Immatriculation") : get(data.lessor, label);
            const right = get(data.tenant, label);
            if (!left && !right) return null;
            return (
              <View key={label} style={{ flexDirection: "row", borderTopWidth: 0.6, borderTopColor: p.line }}>
                <Text style={{ width: 84, padding: 4, fontFamily: f.regular, fontSize: 7.8, color: p.muted }}>
                  {label === "Pièce d'identité" ? (hotel ? "Identité / immat." : "Pièce / immat.") : label}
                </Text>
                <Text style={{ flex: 1, padding: 4, fontFamily: label === "Nom" ? f.bold : f.regular, fontSize: 8.8 }}>{left || "—"}</Text>
                <Text style={{ flex: 1, padding: 4, fontFamily: label === "Nom" ? f.bold : f.regular, fontSize: 8.8 }}>{right || "—"}</Text>
              </View>
            );
          })}
        </View>
      );
      break;
    }
  }
  return (
    <View>
      {intro}
      {body}
    </View>
  );
}

function ParagraphText({ text, theme, palette: p }: { text: string; theme: ContractTheme; palette: PdfPalette }) {
  return <Text style={{ fontFamily: fontsFor(theme).regular, fontSize: 9.2, lineHeight: 1.42, color: p.ink, textAlign: "justify", marginBottom: 3 }}>{text}</Text>;
}

function ArticleBody({ article, theme, palette: p }: { article: ContractArticle; theme: ContractTheme; palette: PdfPalette }) {
  return (
    <View>
      {article.paragraphs.map((text, index) => (
        <ParagraphText key={index} text={text} theme={theme} palette={p} />
      ))}
      {article.bullets?.map((text, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 5, marginBottom: 2, paddingLeft: 4 }}>
          <Text style={{ fontFamily: fontsFor(theme).bold, fontSize: 9.2, color: p.accentText }}>•</Text>
          <Text style={{ fontFamily: fontsFor(theme).regular, fontSize: 9.2, lineHeight: 1.42, color: p.ink, flex: 1, textAlign: "justify" }}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function Article({ article, index, theme, palette: p }: { article: ContractArticle; index: number; theme: ContractTheme; palette: PdfPalette }) {
  const f = fontsFor(theme);
  const n = index + 1;
  const body = <ArticleBody article={article} theme={theme} palette={p} />;
  const badge = (shape: "circle" | "square" | "chip") => (
    <View
      style={{
        width: 15,
        height: 15,
        borderRadius: shape === "circle" ? 8 : shape === "chip" ? 7 : 2.5,
        backgroundColor: shape === "square" ? p.primary : p.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: f.bold, fontSize: 8, color: shape === "square" ? p.onPrimary : p.onAccent }}>{n}</Text>
    </View>
  );

  switch (theme.article) {
    case "rule":
      return (
        <View style={{ marginBottom: 9 }} wrap={false}>
          <Text style={{ fontFamily: f.bold, fontSize: 9.4, textTransform: "uppercase", letterSpacing: 0.5, color: p.ink, borderBottomWidth: 0.5, borderBottomColor: p.primary, paddingBottom: 2, marginBottom: 4 }}>
            Article {n} — {article.title}
          </Text>
          {body}
        </View>
      );
    case "centered":
      return (
        <View style={{ marginBottom: 10 }} wrap={false}>
          <Text style={{ fontFamily: f.regular, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", color: p.accentText, textAlign: "center" }}>Article {n}</Text>
          <Text style={{ fontFamily: f.italic, fontSize: 11, color: p.ink, textAlign: "center", marginBottom: 4 }}>{article.title}</Text>
          {body}
        </View>
      );
    case "circle":
    case "square":
      return (
        <View style={{ marginBottom: 9 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {badge(theme.article)}
            <Text style={{ fontFamily: f.bold, fontSize: 10, color: p.primary }}>{article.title}</Text>
          </View>
          <View style={{ paddingLeft: 21 }}>{body}</View>
        </View>
      );
    case "bar":
      return (
        <View style={{ marginBottom: 8, borderLeftWidth: 3, borderLeftColor: p.accent, paddingLeft: 9 }} wrap={false}>
          <Text style={{ fontFamily: f.bold, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6, color: p.primary, marginBottom: 3 }}>
            {n}. {article.title}
          </Text>
          {body}
        </View>
      );
    case "plain":
      return (
        <View style={{ marginBottom: 11 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
            <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted }}>{String(n).padStart(2, "0")}</Text>
            <Text style={{ fontFamily: f.bold, fontSize: 9.8, color: p.ink }}>{article.title}</Text>
          </View>
          {body}
        </View>
      );
    case "box":
      return (
        <View style={{ marginBottom: 8, borderWidth: 0.7, borderColor: p.line }} wrap={false}>
          <Text style={{ fontFamily: f.bold, fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.6, color: p.primary, backgroundColor: p.tint, paddingHorizontal: 7, paddingVertical: 3 }}>
            Article {n} — {article.title}
          </Text>
          <View style={{ padding: 7 }}>{body}</View>
        </View>
      );
    case "soft":
      return (
        <View style={{ marginBottom: 8, backgroundColor: p.tint, borderRadius: 10, padding: 9 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {badge("chip")}
            <Text style={{ fontFamily: f.bold, fontSize: 10, color: p.ink }}>{article.title}</Text>
          </View>
          <View style={{ paddingLeft: 21 }}>{body}</View>
        </View>
      );
  }
}

function Signatures({ doc, theme, palette: p }: { doc: ContractDoc; theme: ContractTheme; palette: PdfPalette }) {
  const f = fontsFor(theme);
  const data = partyRows(doc);
  const block = (title: string, hint: string) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: f.bold, fontSize: 9, color: p.ink }}>{title}</Text>
      <Text style={{ fontFamily: f.italic, fontSize: 7.5, color: p.muted, marginTop: 1 }}>« Lu et approuvé »</Text>
      <View style={{ height: 52, borderBottomWidth: 0.7, borderBottomColor: p.ink, marginTop: 4 }} />
      <Text style={{ fontFamily: f.regular, fontSize: 7, color: p.muted, marginTop: 2 }}>{hint}</Text>
    </View>
  );
  return (
    <View wrap={false} style={{ marginTop: 10 }}>
      <Text style={{ fontFamily: f.regular, fontSize: 9, color: p.ink, marginBottom: 8 }}>Fait en deux exemplaires, le {fmtDate(doc.issuedAt)}.</Text>
      <View style={{ flexDirection: "row", gap: 28 }}>
        {block(data.lessorTitle, "Cachet et signature")}
        {block(data.tenantTitle, "Signature")}
      </View>
    </View>
  );
}

export function ContractPdf({ doc, theme }: { doc: ContractDoc; theme: ContractTheme }) {
  const palette = pdfPalette(doc.brand.colors);
  const { title, subtitle } = contractTitle(doc.kind);
  const articles = buildContractArticles(doc);
  const f = fontsFor(theme);
  const data = partyRows(doc);

  const sidebar = theme.sidebar ? (
    <View style={{ gap: 12 }}>
      {[
        [data.lessorTitle, data.lessor],
        [data.tenantTitle, data.tenant],
        ["L'essentiel", keyFacts(doc)],
      ].map(([heading, rows]) => (
        <View key={heading as string} style={{ borderTopWidth: 1.5, borderTopColor: palette.primary, paddingTop: 4 }}>
          <Text style={{ fontFamily: f.bold, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: palette.primary, marginBottom: 4 }}>{heading as string}</Text>
          <View style={{ gap: 3 }}>
            {(rows as Row[]).map(([label, value]) => (
              <View key={label}>
                <Text style={{ fontFamily: f.regular, fontSize: 7, color: palette.muted }}>{label}</Text>
                <Text style={{ fontFamily: label === "Nom" ? f.bold : f.regular, fontSize: 8.6, color: palette.ink }}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  ) : undefined;

  return (
    <Document title={`${title} — ${doc.tenant.name}`} author={doc.brand.name} subject={subtitle}>
      <DocumentShell
        theme={theme}
        palette={palette}
        brand={doc.brand}
        title={title}
        subtitle={subtitle}
        reference={doc.number ? `N° ${doc.number}` : doc.sample ? "Aperçu" : "Sans numéro"}
        dateLabel={`Émis le ${fmtDate(doc.issuedAt)}`}
        sample={doc.sample}
        sidebar={sidebar}
        after={
          theme.sidebar ? (
            <View style={{ marginTop: 14 }}>
              {articles.slice(SIDEBAR_ROW_ARTICLES).map((article, index) => (
                <Article key={article.title} article={article} index={SIDEBAR_ROW_ARTICLES + index} theme={theme} palette={palette} />
              ))}
              <Signatures doc={doc} theme={theme} palette={palette} />
            </View>
          ) : undefined
        }
      >
        {theme.sidebar ? null : <Parties doc={doc} theme={theme} palette={palette} />}
        {(theme.sidebar ? articles.slice(0, SIDEBAR_ROW_ARTICLES) : articles).map((article, index) => (
          <Article key={article.title} article={article} index={index} theme={theme} palette={palette} />
        ))}
        {theme.sidebar ? null : <Signatures doc={doc} theme={theme} palette={palette} />}
      </DocumentShell>
    </Document>
  );
}

export async function renderContractPdf(doc: ContractDoc, themeId: number): Promise<Buffer> {
  const theme = CONTRACT_THEMES.find((candidate) => candidate.id === themeId) ?? CONTRACT_THEMES[0];
  return renderToBuffer(<ContractPdf doc={doc} theme={theme} />);
}
