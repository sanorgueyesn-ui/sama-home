// Quittance de loyer (résidences) : même coque et mêmes habillages que les contrats. Un paiement partiel
// n'est JAMAIS présenté comme une quittance : c'est un « reçu pour paiement partiel », avec le reste dû.
import { Document, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { CONTRACT_THEMES, type ContractTheme } from "./contract-themes";
import { DocumentShell, fontsFor } from "./document-shell";
import { amountInWordsCfaInline, fmtDate, fmtMonthYear, fmtMoney } from "./format";
import { pdfPalette } from "./palette";
import type { QuittanceDoc } from "./types";

export function quittanceTitle(doc: QuittanceDoc): { title: string; subtitle: string } {
  const month = fmtMonthYear(doc.period.start);
  return doc.remainingDue > 0
    ? { title: "REÇU POUR PAIEMENT PARTIEL", subtitle: `Loyer de ${month}` }
    : { title: "QUITTANCE DE LOYER", subtitle: `Loyer de ${month}` };
}

/** Phrase de réception : toute la substance juridique de la quittance, construite une fois. */
export function quittanceStatement(doc: QuittanceDoc): string[] {
  const { brand, tenant, property, period } = doc;
  const due = doc.rent + doc.charges;
  const paidFor = doc.charges > 0 ? "du loyer et des charges" : "du loyer";
  const ref = doc.reference ? ` (référence ${doc.reference})` : "";
  const received = `${brand.name}, bailleur, déclare avoir reçu de ${tenant.name} la somme de ${fmtMoney(doc.received)} (${amountInWordsCfaInline(doc.received)}), le ${fmtDate(doc.receivedAt)}, par ${doc.method}${ref}, au titre ${paidFor} pour la période du ${fmtDate(period.start)} au ${fmtDate(period.end)}, pour ${property.typeLabel.toLowerCase()} « ${property.name} ».`;
  if (doc.remainingDue > 0) {
    return [
      received,
      `Ce paiement est partiel : sur ${fmtMoney(due)} dus pour la période, il reste ${fmtMoney(doc.remainingDue)}. Il ne vaut pas quittance du loyer de la période.`,
    ];
  }
  return [received, "Le bailleur lui en donne quittance, sous réserve de tous ses droits."];
}

export function QuittancePdf({ doc, theme }: { doc: QuittanceDoc; theme: ContractTheme }) {
  const p = pdfPalette(doc.brand.colors);
  const f = fontsFor(theme);
  const { title, subtitle } = quittanceTitle(doc);
  const due = doc.rent + doc.charges;
  const rows: [string, string, boolean?][] = [
    ["Loyer", fmtMoney(doc.rent)],
    ...(doc.charges > 0 ? [["Charges", fmtMoney(doc.charges)] as [string, string]] : []),
    ["Total dû pour la période", fmtMoney(due), true],
    ["Somme reçue", fmtMoney(doc.received), true],
    ...(doc.remainingDue > 0 ? [["Reste dû", fmtMoney(doc.remainingDue), true] as [string, string, boolean]] : []),
  ];
  const statement = quittanceStatement(doc);

  return (
    <Document title={`${title} — ${doc.tenant.name}`} author={doc.brand.name}>
      <DocumentShell
        theme={theme}
        palette={p}
        brand={doc.brand}
        title={title}
        subtitle={subtitle}
        reference={doc.number ? `N° ${doc.number}` : doc.sample ? "Aperçu" : "Sans numéro"}
        dateLabel={`Émise le ${fmtDate(doc.issuedAt)}`}
        sample={doc.sample}
      >
        <View style={{ marginTop: 6 }}>
          {statement.map((text, index) => (
            <Text key={index} style={{ fontFamily: f.regular, fontSize: 10.5, lineHeight: 1.55, textAlign: "justify", marginBottom: 8, color: p.ink }}>
              {text}
            </Text>
          ))}
        </View>

        <View wrap={false} style={{ marginTop: 10, borderWidth: 0.7, borderColor: p.line }}>
          {rows.map(([label, value, strong], index) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: strong ? p.tint : "#FFFFFF",
                borderTopWidth: index === 0 ? 0 : 0.5,
                borderTopColor: p.line,
              }}
            >
              <Text style={{ fontFamily: strong ? f.bold : f.regular, fontSize: 10, color: p.ink }}>{label}</Text>
              <Text style={{ fontFamily: strong ? f.bold : f.regular, fontSize: 10, color: doc.remainingDue > 0 && label === "Reste dû" ? p.secondary : p.ink }}>{value}</Text>
            </View>
          ))}
        </View>

        <View wrap={false} style={{ marginTop: 30, flexDirection: "row", justifyContent: "flex-end" }}>
          <View style={{ width: 220 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 9.5, color: p.ink }}>Le bailleur</Text>
            <Text style={{ fontFamily: f.italic, fontSize: 8, color: p.muted }}>Fait le {fmtDate(doc.issuedAt)}</Text>
            <View style={{ height: 56, borderBottomWidth: 0.7, borderBottomColor: p.ink, marginTop: 4 }} />
            <Text style={{ fontFamily: f.regular, fontSize: 7, color: p.muted, marginTop: 2 }}>Cachet et signature</Text>
          </View>
        </View>
      </DocumentShell>
    </Document>
  );
}

export async function renderQuittancePdf(doc: QuittanceDoc, themeId: number): Promise<Buffer> {
  const theme = CONTRACT_THEMES.find((candidate) => candidate.id === themeId) ?? CONTRACT_THEMES[0];
  return renderToBuffer(<QuittancePdf doc={doc} theme={theme} />);
}
