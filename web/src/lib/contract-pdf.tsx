import { Document, Page, View, Text, Image as PdfImage, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatDuration, type DurationUnitValue } from "@/lib/duration";
import type { PaymentSummary } from "@/lib/payment-summary";
import type { PdfImageSource } from "@/lib/object-storage";
import type { BrandColors } from "@/lib/brand-colors";

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
  logoImage: PdfImageSource | null;
  brandColors: BrandColors;
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

function fmtDateOnly(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 32,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#1A202C",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#D97706",
    paddingBottom: 8,
    marginBottom: 8,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "60%",
  },
  logo: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },
  establishmentName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  establishmentMeta: {
    fontSize: 7.5,
    color: "#64748B",
    marginTop: 2,
  },
  contractTitleBlock: {
    alignItems: "flex-end",
  },
  contractMainTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contractRef: {
    fontSize: 7.5,
    color: "#64748B",
    marginTop: 2,
  },
  betweenBlock: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    marginVertical: 4,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  twoCols: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  boxCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 7,
    backgroundColor: "#F8FAFC",
  },
  boxCardTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    borderBottomWidth: 0.8,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 3,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 8,
  },
  infoLabel: {
    width: "35%",
    color: "#64748B",
    fontFamily: "Helvetica-Bold",
  },
  infoValue: {
    width: "65%",
    color: "#0F172A",
  },
  articleBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 5,
    padding: 6,
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  articleHeader: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 2.5,
    textTransform: "uppercase",
  },
  articleContent: {
    fontSize: 8,
    lineHeight: 1.3,
    color: "#334155",
  },
  bulletList: {
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 7.8,
    lineHeight: 1.25,
    color: "#334155",
    marginBottom: 1,
  },
  paymentCheckRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 3,
    fontSize: 7.8,
  },
  checkItem: {
    color: "#0F172A",
  },
  signaturesBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sigBox: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 5,
    padding: 6,
    minHeight: 58,
    backgroundColor: "#FFFFFF",
  },
  sigTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  sigMention: {
    fontSize: 6.8,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 1,
  },
  sigLineArea: {
    marginTop: 24,
    borderTopWidth: 0.8,
    borderTopColor: "#94A3B8",
    paddingTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 10,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.8,
    color: "#94A3B8",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 3,
  },
});

export function RentalContractDocument({ rental, settings, summary, logoImage }: ContractData) {
  const establishmentName = settings?.establishmentName ?? "SAMA HOME";
  const todayDate = fmtDateOnly(new Date());
  const propertyTitle = rental.property.type === "APARTMENT" ? "D'APPARTEMENT MEUBLÉ" : "DE CHAMBRE MEUBLÉE";

  const isLongContract = rental.durationUnit === "DAY" && rental.durationValue >= 2;
  const docTitle = isLongContract ? `CONTRAT DE LOCATION ${propertyTitle}` : `REÇU DE LOCATION ${propertyTitle}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE OFFICIEL */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {logoImage ? <PdfImage src={{ data: logoImage.data, format: logoImage.format }} style={styles.logo} /> : null}
            <View>
              <Text style={styles.establishmentName}>{establishmentName}</Text>
              <Text style={styles.establishmentMeta}>
                {[settings?.address, settings?.phone].filter(Boolean).join(" • Tél : ")}
              </Text>
            </View>
          </View>

          <View style={styles.contractTitleBlock}>
            <Text style={styles.contractMainTitle}>{docTitle}</Text>
            <Text style={styles.contractRef}>
              Réf. dossier : #{rental.id.slice(-8).toUpperCase()} • Date : {todayDate}
            </Text>
          </View>
        </View>

        <Text style={styles.betweenBlock}>Entre les soussignés :</Text>

        {/* BAILLEUR ET LOCATAIRE */}
        <View style={styles.twoCols}>
          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Le Bailleur :</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom :</Text>
              <Text style={styles.infoValue}>{establishmentName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse :</Text>
              <Text style={styles.infoValue}>{settings?.address || "Dakar, Sénégal"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone :</Text>
              <Text style={styles.infoValue}>{[settings?.phone, settings?.secondaryPhone].filter(Boolean).join(" / ") || "—"}</Text>
            </View>
          </View>

          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Et le Locataire :</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom :</Text>
              <Text style={[styles.infoValue, { fontFamily: "Helvetica-Bold" }]}>{rental.client.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone :</Text>
              <Text style={styles.infoValue}>{rental.client.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pièce d&apos;identité :</Text>
              <Text style={[styles.infoValue, { color: "#D97706", fontFamily: "Helvetica-Bold" }]}>
                {rental.client.idDocumentType ? `${rental.client.idDocumentType} : ${rental.client.idDocumentNumber || "—"}` : "Renseignée"}
              </Text>
            </View>
          </View>
        </View>

        {/* ARTICLE 1 : OBJET DU CONTRAT */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 1 : OBJET DU CONTRAT</Text>
          <Text style={styles.articleContent}>
            Le présent contrat concerne la location du logement meublé situé à :{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{settings?.address || "Dakar"}</Text>.{"\n"}
            Désignation : <Text style={{ fontFamily: "Helvetica-Bold" }}>{rental.property.name}</Text>.{" "}
            Le logement est loué meublé avec les équipements suivants : lit, climatisation, télévision, salle d&apos;eau privée, rangements, et accessoires d&apos;accueil.
          </Text>
        </View>

        {/* ARTICLE 2 : DURÉE */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 2 : DURÉE</Text>
          <Text style={styles.articleContent}>
            La location est consentie pour une durée ferme de :{" "}
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#2563EB" }}>
              {formatDuration(rental.durationValue, rental.durationUnit)}
            </Text>.{"\n"}
            À compter du : <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmtDateTime(rental.arrivalAt)}</Text>{" "}
            Jusqu&apos;au : <Text style={{ fontFamily: "Helvetica-Bold" }}>{fmtDateTime(rental.plannedDepartureAt)}</Text>.
          </Text>
        </View>

        {/* ARTICLE 3 : LOYER */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 3 : LOYER ET MODALITÉS DE PAIEMENT</Text>
          <Text style={styles.articleContent}>
            Le montant total du loyer est fixé à :{" "}
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#0F172A" }}>{fmtFcfa(summary.totalDue)}</Text>.
          </Text>
          <View style={styles.paymentCheckRow}>
            <Text style={styles.checkItem}>Modalités : [ ✓ ] Séjour / Forfait   [   ] Quotidien   [   ] Mensuel</Text>
            <Text style={styles.checkItem}>Paiement : [ ✓ ] Espèces   [ ✓ ] Transfert mobile (Wave, Orange Money)</Text>
          </View>
        </View>

        {/* ARTICLE 4 : CAUTION / RÈGLEMENT */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 4 : CAUTION / ACOMPTE ET SOLDE</Text>
          <Text style={styles.articleContent}>
            Le locataire a versé la somme de :{" "}
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#16A34A" }}>{fmtFcfa(summary.totalPaid)}</Text>{" "}
            pour la durée de son séjour.{"\n"}
            Solde restant dû :{" "}
            <Text style={{ fontFamily: "Helvetica-Bold", color: summary.remaining > 0 ? "#DC2626" : "#16A34A" }}>
              {summary.remaining > 0 ? fmtFcfa(summary.remaining) : "0 FCFA (Entièrement soldé)"}
            </Text>.
          </Text>
        </View>

        {/* ARTICLE 5 : OBLIGATIONS DU LOCATAIRE */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 5 : OBLIGATIONS DU LOCATAIRE</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Utiliser le logement de manière responsable et paisible.</Text>
            <Text style={styles.bulletItem}>• Ne pas causer de nuisances sonores de jour comme de nuit (respect absolu du voisinage).</Text>
            <Text style={styles.bulletItem}>• Respecter les équipements, le mobilier et la propreté des lieux (logement strictement non-fumeur).</Text>
          </View>
        </View>

        {/* ARTICLE 6 : OBLIGATIONS DU BAILLEUR */}
        <View style={styles.articleBox}>
          <Text style={styles.articleHeader}>ARTICLE 6 : OBLIGATIONS DU BAILLEUR</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Fournir un logement propre, fonctionnel et en parfait état d&apos;usage.</Text>
            <Text style={styles.bulletItem}>• Assurer les réparations nécessaires au bon déroulement du séjour (hors dégâts imputables au locataire).</Text>
          </View>
        </View>

        {/* SIGNATURES */}
        <View style={styles.signaturesBlock}>
          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>Pour le Bailleur</Text>
            <Text style={styles.sigMention}>Mention « Lu et approuvé »</Text>
            <View style={styles.sigLineArea}>
              <Text style={{ fontSize: 6.5, color: "#64748B" }}>Cachet &amp; Signature</Text>
            </View>
          </View>

          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>Et le Locataire</Text>
            <Text style={styles.sigMention}>Mention manuscrite « Lu et approuvé »</Text>
            <View style={styles.sigLineArea}>
              <Text style={{ fontSize: 6.5, color: "#64748B" }}>Signature du preneur</Text>
            </View>
          </View>
        </View>

        {/* PIED DE PAGE */}
        <View style={styles.footer}>
          <Text>SAMA HOME • Établissement {establishmentName}</Text>
          <Text>Document contractuel officiel — Page 1 / 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderRentalContractPdf(data: ContractData): Promise<Buffer> {
  return renderToBuffer(<RentalContractDocument {...data} />);
}
