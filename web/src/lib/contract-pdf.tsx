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

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  ROOM: "Chambre meublée",
  APARTMENT: "Appartement meublé",
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
    paddingTop: 30,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1A202C",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#D97706",
    paddingBottom: 14,
    marginBottom: 12,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "58%",
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  establishmentName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  establishmentMeta: {
    fontSize: 7.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 1.3,
  },
  titleBlock: {
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  contractBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  contractBadgeText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#B45309",
    textTransform: "uppercase",
  },
  contractTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textAlign: "right",
  },
  contractMeta: {
    fontSize: 7.5,
    color: "#64748B",
    marginTop: 2,
    textAlign: "right",
  },
  subHeaderLegal: {
    fontSize: 7.5,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
    paddingLeft: 6,
    marginBottom: 6,
    marginTop: 8,
  },
  twoCols: {
    flexDirection: "row",
    gap: 12,
  },
  boxCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 8,
    backgroundColor: "#F8FAFC",
  },
  boxCardTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CBD5E1",
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 8,
  },
  infoLabel: {
    color: "#64748B",
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textAlign: "right",
  },
  highlightCard: {
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  highlightTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#92400E",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  tableFinancial: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    marginVertical: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
    fontSize: 8,
  },
  tableRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
    fontSize: 8.5,
  },
  clausesBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    padding: 7,
    backgroundColor: "#FAFAFA",
    marginTop: 6,
    marginBottom: 10,
  },
  clauseArticle: {
    marginBottom: 4,
    fontSize: 7.2,
    lineHeight: 1.25,
    color: "#334155",
  },
  clauseTitle: {
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  signaturesBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  sigBox: {
    width: "47%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    padding: 8,
    minHeight: 70,
    backgroundColor: "#FFFFFF",
  },
  sigTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  sigMention: {
    fontSize: 6.8,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 1,
  },
  sigLineArea: {
    marginTop: 28,
    borderTopWidth: 0.8,
    borderTopColor: "#94A3B8",
    paddingTop: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94A3B8",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 4,
  },
});

export function RentalContractDocument({ rental, settings, summary, logoImage, brandColors }: ContractData) {
  const establishmentName = settings?.establishmentName ?? "SAMA HOME";
  const generatedAt = fmtDateTime(new Date());
  const todayDate = fmtDateOnly(new Date());

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
                {settings?.address || "Dakar, Sénégal"}{"\n"}
                Tél : {[settings?.phone, settings?.secondaryPhone].filter(Boolean).join(" / ")}
                {settings?.email ? ` • ${settings.email}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <View style={styles.contractBadge}>
              <Text style={styles.contractBadgeText}>Contrat de Bail Saisonnier</Text>
            </View>
            <Text style={styles.contractTitle}>CONTRAT DE LOCATION</Text>
            <Text style={styles.contractMeta}>
              Réf. dossier : #{rental.id.slice(-8).toUpperCase()}{"\n"}
              Établi le : {todayDate}
            </Text>
          </View>
        </View>

        <Text style={styles.subHeaderLegal}>
          Bail de location meublée saisonnière à usage exclusif de villégiature — Régie par les articles 1713 et suivants du Code civil
        </Text>

        {/* 1. LES PARTIES CONTRACTANTES */}
        <Text style={styles.sectionTitle}>1. Désignation des parties</Text>
        <View style={styles.twoCols}>
          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Le Bailleur (Établissement)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom :</Text>
              <Text style={styles.infoValue}>{establishmentName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone :</Text>
              <Text style={styles.infoValue}>{settings?.phone || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse :</Text>
              <Text style={styles.infoValue}>{settings?.address || "Dakar"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Statut :</Text>
              <Text style={styles.infoValue}>Gestionnaire professionnel</Text>
            </View>
          </View>

          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Le Preneur (Locataire)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet :</Text>
              <Text style={styles.infoValue}>{rental.client.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone :</Text>
              <Text style={styles.infoValue}>{rental.client.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pièce d&apos;identité :</Text>
              <Text style={[styles.infoValue, { color: "#D97706" }]}>
                {rental.client.idDocumentType ? `${rental.client.idDocumentType} : ${rental.client.idDocumentNumber || "—"}` : "Non requise"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse / Ville :</Text>
              <Text style={styles.infoValue}>{rental.client.address || "Dakar"}</Text>
            </View>
          </View>
        </View>

        {/* 2. LE LOGEMENT ET LA DURÉE FERME DU SÉJOUR */}
        <Text style={styles.sectionTitle}>2. Objet de la location &amp; Durée ferme</Text>
        <View style={styles.twoCols}>
          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Logement loué</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Désignation :</Text>
              <Text style={styles.infoValue}>{rental.property.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type de bien :</Text>
              <Text style={styles.infoValue}>{PROPERTY_TYPE_LABELS[rental.property.type] ?? "Hébergement meublé"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Formule :</Text>
              <Text style={styles.infoValue}>{rental.tariff?.label ?? "Séjour standard"}</Text>
            </View>
          </View>

          <View style={styles.boxCard}>
            <Text style={styles.boxCardTitle}>Période du séjour</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Arrivée (Check-in) :</Text>
              <Text style={styles.infoValue}>{fmtDateTime(rental.arrivalAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Départ (Check-out) :</Text>
              <Text style={styles.infoValue}>{fmtDateTime(rental.plannedDepartureAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Durée convenue :</Text>
              <Text style={[styles.infoValue, { color: "#2563EB" }]}>{formatDuration(rental.durationValue, rental.durationUnit)}</Text>
            </View>
          </View>
        </View>

        {/* 3. CONDITIONS FINANCIÈRES */}
        <Text style={styles.sectionTitle}>3. Conditions financières &amp; Règlement</Text>
        <View style={styles.tableFinancial}>
          <View style={styles.tableRow}>
            <Text style={styles.infoLabel}>Loyer total du séjour ({formatDuration(rental.durationValue, rental.durationUnit)}) :</Text>
            <Text style={styles.infoValue}>{fmtFcfa(summary.totalDue)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.infoLabel}>Montant versé / Dépôt à l&apos;entrée :</Text>
            <Text style={[styles.infoValue, { color: "#16A34A" }]}>{fmtFcfa(summary.totalPaid)}</Text>
          </View>
          <View style={styles.tableRowTotal}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#0F172A" }}>Solde restant dû :</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: summary.remaining > 0 ? "#DC2626" : "#16A34A" }}>
              {summary.remaining > 0 ? fmtFcfa(summary.remaining) : "0 FCFA (Entièrement soldé)"}
            </Text>
          </View>
        </View>

        {/* 4. CLAUSES ET RÈGLEMENT INTÉRIEUR */}
        <Text style={styles.sectionTitle}>4. Conditions générales &amp; Obligations des parties</Text>
        <View style={styles.clausesBox}>
          <Text style={styles.clauseArticle}>
            <Text style={styles.clauseTitle}>Art. 1 — Usage des lieux : </Text>
            Le logement est consenti exclusivement à usage d&apos;habitation temporaire et de villégiature. Il est strictement interdit d&apos;y élire domicile, de sous-louer ou de céder le présent contrat à un tiers, même à titre gracieux.
          </Text>
          <Text style={styles.clauseArticle}>
            <Text style={styles.clauseTitle}>Art. 2 — Tranquillité &amp; Bon père de famille : </Text>
            Le preneur s&apos;engage à user paisiblement des locaux. Les fêtes bruyantes, soirées de groupe et toute nuisance sonore nocturne sont formellement interdites. Le preneur s&apos;engage à respecter scrupuleusement le repos des autres résidents et du voisinage.
          </Text>
          <Text style={styles.clauseArticle}>
            <Text style={styles.clauseTitle}>Art. 3 — Respect du mobilier &amp; Non-fumeur : </Text>
            Le preneur s&apos;engage à maintenir le mobilier, la climatisation et les équipements en parfait état. Le logement est strictement non-fumeur à l&apos;intérieur.
          </Text>
          <Text style={styles.clauseArticle}>
            <Text style={styles.clauseTitle}>Art. 4 — Restitution &amp; Dégradations : </Text>
            À l&apos;expiration de la durée convenue, le logement et ses clés doivent être restitués dans l&apos;état constaté à l&apos;arrivée. Tout objet manquant ou détérioré fera l&apos;objet d&apos;une facturation immédiate au preneur.
          </Text>
          <Text style={styles.clauseArticle}>
            <Text style={styles.clauseTitle}>Art. 5 — Clause résolutoire : </Text>
            En cas de non-respect avéré des clauses de ce contrat ou de comportement préjudiciable, le présent contrat sera résilié de plein droit sur-le-champ par le bailleur, sans préavis ni indemnité de remboursement.
          </Text>
        </View>

        {/* 5. SIGNATURES */}
        <View style={styles.signaturesBlock}>
          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>Pour le Bailleur</Text>
            <Text style={styles.sigMention}>Mention « Lu et approuvé »</Text>
            <View style={styles.sigLineArea}>
              <Text style={{ fontSize: 6.5, color: "#64748B" }}>Cachet &amp; Signature</Text>
            </View>
          </View>

          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>Le Preneur (Locataire)</Text>
            <Text style={styles.sigMention}>Mention manuscrite « Lu et approuvé »</Text>
            <View style={styles.sigLineArea}>
              <Text style={{ fontSize: 6.5, color: "#64748B" }}>Signature précédée de la mention</Text>
            </View>
          </View>
        </View>

        {/* PIED DE PAGE */}
        <View style={styles.footer}>
          <Text>SAMA HOME • Gestion Locative &amp; Hôtelière Professionnelle</Text>
          <Text>Contrat généré le {generatedAt} — Page 1 / 1</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderRentalContractPdf(data: ContractData): Promise<Buffer> {
  return renderToBuffer(<RentalContractDocument {...data} />);
}
