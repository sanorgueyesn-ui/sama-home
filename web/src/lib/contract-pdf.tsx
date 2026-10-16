// Pas de `import "server-only"` ici : ce module est pur (aucune donnée
// secrète, aucun accès Prisma/cookies — seulement @react-pdf/renderer),
// même distinction que src/lib/transfer-frequency.ts (pur, testable) vs
// src/lib/transfer-schedule-engine.ts (server-only, touche la base). Rend
// aussi ce fichier exécutable par scripts/test-contract-pdf.mts (npx tsx),
// que "server-only" bloquerait systématiquement hors runtime Next.js.
import { Document, Page, View, Text, Image as PdfImage, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatDuration, type DurationUnitValue } from "@/lib/duration";
import type { PaymentSummary } from "@/lib/payment-summary";
import type { PdfImageSource } from "@/lib/object-storage";
import type { BrandColors } from "@/lib/brand-colors";

/**
 * Lot "Contrat de location PDF" — document généré UNIQUEMENT à partir de
 * données réellement enregistrées (client, logement, tarif, location,
 * paramètres de l'établissement) : aucune valeur inventée. La section
 * "Obligations des parties" n'a volontairement AUCUNE clause rédigée ici —
 * le mandat de ce lot interdit explicitement d'inventer une clause
 * juridique ou commerciale non confirmée ; cette section reste un cadre
 * vide, à compléter par l'établissement lui-même (voir le rapport).
 */

type ContractClient = {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
};

type ContractProperty = {
  name: string;
  type: "ROOM" | "APARTMENT";
  description: string | null;
};

type ContractSettings = {
  establishmentName: string;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  email: string | null;
} | null;

export type ContractData = {
  rental: {
    id: string;
    client: ContractClient;
    property: ContractProperty;
    tariff: { label: string } | null;
    arrivalAt: Date;
    plannedDepartureAt: Date;
    durationValue: number;
    durationUnit: DurationUnitValue;
    deposit: number;
    note: string | null;
  };
  settings: ContractSettings;
  summary: PaymentSummary;
  /**
   * Octets bruts du logo (déjà lus depuis le Bucket Railway par
   * src/lib/contract-data.ts) — jamais une URL ici : un bucket privé ne
   * serait pas accessible par le moteur de rendu PDF via une simple
   * requête réseau, et une URL présignée pourrait expirer pendant le
   * rendu. `null` = logo absent, inaccessible, ou dans un format que
   * @react-pdf/renderer ne peut pas intégrer en données brutes (WebP) —
   * le contrat se génère quand même, sans logo.
   */
  logoImage: PdfImageSource | null;
  /**
   * Lot "Personnalisation des couleurs" — couleur appliquée au titre du
   * contrat et aux titres de section (voir RentalContractDocument), à la
   * place du navy codé en dur utilisé jusqu'ici. Obligatoire : l'unique
   * appelant (src/app/locations/[id]/contract/route.ts) la fournit toujours
   * via contract-data.ts (resolveBrandColors(), jamais undefined).
   */
  brandColors: BrandColors;
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  ROOM: "Chambre",
  APARTMENT: "Appartement",
};

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#172026" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  logo: { width: 48, height: 48, objectFit: "contain" },
  title: { fontSize: 16, fontWeight: 700, color: "#12304A" },
  subtitle: { fontSize: 9, color: "#52606D", marginTop: 2 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#12304A", marginBottom: 6, borderBottom: "1pt solid #E5E7E6", paddingBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#52606D" },
  value: { fontWeight: 700 },
  obligationsBox: { border: "1pt dashed #9AA3A8", borderRadius: 4, padding: 10, minHeight: 90, color: "#52606D", fontStyle: "italic" },
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  signatureBlock: { width: "45%" },
  signatureLine: { borderTop: "1pt solid #172026", marginTop: 36, paddingTop: 4 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#9AA3A8", textAlign: "center" },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function RentalContractDocument({ rental, settings, summary, logoImage, brandColors }: ContractData) {
  const establishmentName = settings?.establishmentName ?? "Établissement non renseigné";
  const generatedAt = fmtDateTime(new Date());
  const primaryColorStyle = { color: brandColors.primary };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoImage ? <PdfImage src={{ data: logoImage.data, format: logoImage.format }} style={styles.logo} /> : null}
          <View>
            <Text style={[styles.title, primaryColorStyle]}>Contrat de location</Text>
            <Text style={styles.subtitle}>{establishmentName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Bailleur (établissement)</Text>
          <Row label="Nom" value={establishmentName} />
          <Row label="Adresse" value={settings?.address ?? "Non renseignée"} />
          <Row label="Téléphone" value={[settings?.phone, settings?.secondaryPhone].filter(Boolean).join(" / ") || "Non renseigné"} />
          {settings?.email ? <Row label="Email" value={settings.email} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Locataire</Text>
          <Row label="Nom" value={rental.client.name} />
          <Row label="Téléphone" value={rental.client.phone} />
          {rental.client.email ? <Row label="Email" value={rental.client.email} /> : null}
          {rental.client.address ? <Row label="Adresse" value={rental.client.address} /> : null}
          {rental.client.idDocumentType || rental.client.idDocumentNumber ? (
            <Row
              label="Pièce d'identité"
              value={`${rental.client.idDocumentType ?? "—"} ${rental.client.idDocumentNumber ?? ""}`.trim()}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Logement</Text>
          <Row label="Désignation" value={`${rental.property.name} (${PROPERTY_TYPE_LABELS[rental.property.type] ?? rental.property.type})`} />
          <Row label="Adresse" value={settings?.address ?? "Non renseignée"} />
          {rental.property.description ? <Row label="Description" value={rental.property.description} /> : null}
          {rental.tariff ? <Row label="Tarif appliqué" value={rental.tariff.label} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Durée du séjour</Text>
          <Row label="Arrivée" value={fmtDateTime(rental.arrivalAt)} />
          <Row label="Départ prévu" value={fmtDateTime(rental.plannedDepartureAt)} />
          <Row label="Durée" value={formatDuration(rental.durationValue, rental.durationUnit)} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Conditions financières</Text>
          <Row label="Montant total du séjour" value={fmtFcfa(summary.totalDue)} />
          <Row label="Dépôt de garantie / avance" value={fmtFcfa(rental.deposit)} />
          <Row label="Montant déjà réglé" value={fmtFcfa(summary.totalPaid)} />
          <Row label="Solde restant dû" value={fmtFcfa(summary.remaining)} />
          <Row label="Modes de paiement acceptés" value="Espèces, Wave, Orange Money" />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, primaryColorStyle]}>Obligations des parties</Text>
          <View style={styles.obligationsBox}>
            <Text>
              Cette section doit être complétée par l&apos;établissement avec ses propres clauses
              contractuelles. Aucune clause juridique ou commerciale n&apos;a été générée
              automatiquement par SAMA HOME.
            </Text>
          </View>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.label}>Le bailleur</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.label}>Signature</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.label}>Le locataire</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.label}>Signature</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Document généré par SAMA HOME le {generatedAt} — réf. location {rental.id}</Text>
      </Page>
    </Document>
  );
}

export async function renderRentalContractPdf(data: ContractData): Promise<Buffer> {
  return renderToBuffer(<RentalContractDocument {...data} />);
}
