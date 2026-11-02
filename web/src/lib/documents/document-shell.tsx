// Coque commune des documents A4 (contrats, quittances) : en-tête, cadre, bande, pied de page, selon
// l'habillage. Le CORPS du document est fourni par l'appelant. Aucun texte juridique ici.
import type { ReactNode } from "react";
import { Image as PdfImage, Page, Text, View } from "@react-pdf/renderer";
import type { ContractTheme } from "./contract-themes";
import type { PdfPalette } from "./palette";
import type { DocumentBrand } from "./types";

export const PAGE = { width: 595.28, height: 841.89 } as const;

export function fontsFor(theme: ContractTheme) {
  return theme.font === "serif"
    ? { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" }
    : { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
}

export type ShellProps = {
  theme: ContractTheme;
  palette: PdfPalette;
  brand: DocumentBrand;
  title: string;
  subtitle?: string;
  /** « N° 2026-0001 » ou « Aperçu ». */
  reference: string;
  /** « Émis le 29 octobre 2026 ». */
  dateLabel: string;
  sample?: boolean;
  /** Colonne latérale (habillage éditorial) : à côté de `children`, sur la première page seulement. */
  sidebar?: ReactNode;
  /** Suite pleine largeur, sous la colonne latérale (la colonne latérale ne se prolonge pas sur la page 2). */
  after?: ReactNode;
  children: ReactNode;
};

const contactLine = (brand: DocumentBrand) =>
  [brand.address, [brand.phone, brand.secondaryPhone].filter(Boolean).join(" / "), brand.email].filter(Boolean).join("  •  ");

const registerLine = (brand: DocumentBrand) =>
  [brand.ninea ? `NINEA : ${brand.ninea}` : null, brand.rccm ? `RCCM : ${brand.rccm}` : null].filter(Boolean).join("   ");

const LEFT = 44;
const RIGHT = 44;
const TOP = 40;

function Logo({ brand, size }: { brand: DocumentBrand; size: number }) {
  return brand.logo ? <PdfImage src={{ data: brand.logo.data, format: brand.logo.format }} style={{ width: size, height: size, objectFit: "contain" }} /> : null;
}

function Header({ theme, palette: p, brand, title, subtitle, reference, dateLabel }: ShellProps) {
  const f = fontsFor(theme);
  const contact = contactLine(brand);
  const register = registerLine(brand);

  switch (theme.header) {
    case "classic":
      return (
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Logo brand={brand} size={38} />
          <Text style={{ fontFamily: f.bold, fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase", color: p.ink, marginTop: 4 }}>{brand.name}</Text>
          <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted, marginTop: 2, textAlign: "center" }}>{contact}</Text>
          {register ? <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted, marginTop: 1 }}>{register}</Text> : null}
          <View style={{ width: "100%", marginTop: 8, borderTopWidth: 1.5, borderTopColor: p.primary }} />
          <View style={{ width: "100%", marginTop: 2, borderTopWidth: 0.5, borderTopColor: p.primary }} />
          <Text style={{ fontFamily: f.bold, fontSize: 14, marginTop: 12, color: p.ink, letterSpacing: 0.6 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: f.italic, fontSize: 9.5, color: p.muted, marginTop: 2 }}>{subtitle}</Text> : null}
          <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted, marginTop: 5 }}>{reference}  •  {dateLabel}</Text>
        </View>
      );

    case "band":
      return (
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Logo brand={brand} size={34} />
              <View>
                <Text style={{ fontFamily: f.bold, fontSize: 11, color: p.ink }}>{brand.name}</Text>
                <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted, maxWidth: 300 }}>{contact}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: f.bold, fontSize: 8.5, color: p.primary }}>{reference}</Text>
              <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted }}>{dateLabel}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: f.bold, fontSize: 24, color: p.primary, marginTop: 16, letterSpacing: -0.3 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 10, color: p.muted, marginTop: 2 }}>{subtitle}</Text> : null}
          <View style={{ width: 54, height: 4, backgroundColor: p.accent, marginTop: 8, borderRadius: 2 }} />
        </View>
      );

    case "elegant":
      return (
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <Logo brand={brand} size={32} />
          <Text style={{ fontFamily: f.bold, fontSize: 10.5, letterSpacing: 3, textTransform: "uppercase", color: p.ink, marginTop: 5 }}>{brand.name}</Text>
          <Text style={{ fontFamily: f.italic, fontSize: 8, color: p.muted, marginTop: 2, textAlign: "center" }}>{contact}</Text>
          <View style={{ width: 44, marginTop: 12, borderTopWidth: 1, borderTopColor: p.accentText }} />
          <Text style={{ fontFamily: f.italic, fontSize: 25, color: p.ink, marginTop: 12 }}>{title.charAt(0) + title.slice(1).toLowerCase()}</Text>
          {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase", color: p.muted, marginTop: 4 }}>{subtitle}</Text> : null}
          <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted, marginTop: 8 }}>{reference}  —  {dateLabel}</Text>
        </View>
      );

    case "bar":
      return (
        <View style={{ marginLeft: -LEFT, marginRight: -RIGHT, marginTop: -TOP, backgroundColor: p.primary, paddingHorizontal: LEFT, paddingVertical: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {brand.logo ? (
                <View style={{ backgroundColor: "#FFFFFF", padding: 3, borderRadius: 4 }}>
                  <Logo brand={brand} size={28} />
                </View>
              ) : null}
              <View>
                <Text style={{ fontFamily: f.bold, fontSize: 13, color: p.onPrimary }}>{brand.name}</Text>
                <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.onPrimary, opacity: 0.85, maxWidth: 280 }}>{contact}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: f.bold, fontSize: 12, color: p.onPrimary }}>{title}</Text>
              <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.onPrimary, opacity: 0.85, marginTop: 2 }}>{reference}  |  {dateLabel}</Text>
            </View>
          </View>
        </View>
      );

    case "minimal":
      return (
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontFamily: f.bold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: p.ink }}>{brand.name}</Text>
              <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted, marginTop: 2, maxWidth: 330 }}>{contact}</Text>
            </View>
            <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted }}>{reference}  /  {dateLabel}</Text>
          </View>
          <View style={{ marginTop: 10, borderTopWidth: 0.5, borderTopColor: p.line }} />
          <Text style={{ fontFamily: f.regular, fontSize: 21, color: p.ink, marginTop: 18 }}>{title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
            <View style={{ width: 22, borderTopWidth: 1.5, borderTopColor: p.accentText }} />
            {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 9, color: p.muted }}>{subtitle}</Text> : null}
          </View>
        </View>
      );

    case "frame":
      return (
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Logo brand={brand} size={36} />
          <Text style={{ fontFamily: f.bold, fontSize: 16, letterSpacing: 2, textTransform: "uppercase", color: p.primary, marginTop: 4 }}>{brand.name}</Text>
          <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted, marginTop: 2, textAlign: "center" }}>{contact}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <View style={{ width: 70, borderTopWidth: 0.8, borderTopColor: p.primary }} />
            <View style={{ width: 6, height: 6, backgroundColor: p.accent, transform: "rotate(45deg)" }} />
            <View style={{ width: 70, borderTopWidth: 0.8, borderTopColor: p.primary }} />
          </View>
          <Text style={{ fontFamily: f.bold, fontSize: 14, letterSpacing: 2.5, textTransform: "uppercase", color: p.ink, marginTop: 10 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: f.italic, fontSize: 9.5, color: p.muted, marginTop: 2 }}>{subtitle}</Text> : null}
          <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted, marginTop: 5 }}>{reference}  •  {dateLabel}</Text>
        </View>
      );

    case "banner":
      return (
        <View style={{ marginLeft: -LEFT, marginRight: -RIGHT, marginTop: -TOP, backgroundColor: p.accent, paddingHorizontal: LEFT, paddingTop: 24, paddingBottom: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {brand.logo ? (
                <View style={{ backgroundColor: "#FFFFFF", padding: 4, borderRadius: 6 }}>
                  <Logo brand={brand} size={36} />
                </View>
              ) : null}
              <View>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: p.onAccent }}>{brand.name}</Text>
                <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.onAccent, opacity: 0.85, maxWidth: 270, marginTop: 1 }}>{contact}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: f.bold, fontSize: 9, color: p.onAccent }}>{reference}</Text>
              <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.onAccent, opacity: 0.85 }}>{dateLabel}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: f.bold, fontSize: 17, color: p.onAccent, marginTop: 14, letterSpacing: 0.4 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 9.5, color: p.onAccent, opacity: 0.85 }}>{subtitle}</Text> : null}
        </View>
      );

    case "editorial":
      return (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: f.bold, fontSize: 8, letterSpacing: 1.6, textTransform: "uppercase", color: p.muted }}>{brand.name}</Text>
            <Text style={{ fontFamily: f.regular, fontSize: 8, color: p.muted }}>{reference}  —  {dateLabel}</Text>
          </View>
          <View style={{ marginTop: 6, borderTopWidth: 2.5, borderTopColor: p.primary }} />
          <Text style={{ fontFamily: f.bold, fontSize: 30, color: p.primary, marginTop: 10, lineHeight: 1.05 }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: f.italic, fontSize: 11, color: p.muted, marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
      );

    case "form":
      return (
        <View style={{ marginBottom: 14, borderWidth: 1, borderColor: p.primary, flexDirection: "row" }}>
          <View style={{ flex: 1.5, padding: 8, borderRightWidth: 1, borderRightColor: p.primary }}>
            <Text style={{ fontFamily: f.bold, fontSize: 6.5, letterSpacing: 0.8, textTransform: "uppercase", color: p.muted }}>Établissement</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <Logo brand={brand} size={26} />
              <View>
                <Text style={{ fontFamily: f.bold, fontSize: 11, color: p.ink }}>{brand.name}</Text>
                <Text style={{ fontFamily: f.regular, fontSize: 7, color: p.muted, maxWidth: 200 }}>{contact}</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1.2, padding: 8, borderRightWidth: 1, borderRightColor: p.primary, backgroundColor: p.tint }}>
            <Text style={{ fontFamily: f.bold, fontSize: 6.5, letterSpacing: 0.8, textTransform: "uppercase", color: p.muted }}>Document</Text>
            <Text style={{ fontFamily: f.bold, fontSize: 11, color: p.primary, marginTop: 3 }}>{title}</Text>
            {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted }}>{subtitle}</Text> : null}
          </View>
          <View style={{ flex: 0.9, padding: 8 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 6.5, letterSpacing: 0.8, textTransform: "uppercase", color: p.muted }}>Référence</Text>
            <Text style={{ fontFamily: f.bold, fontSize: 10, color: p.ink, marginTop: 3 }}>{reference}</Text>
            <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted }}>{dateLabel}</Text>
          </View>
        </View>
      );

    case "soft":
      return (
        <View style={{ marginBottom: 14, backgroundColor: p.tint, borderRadius: 14, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {brand.logo ? (
                <View style={{ backgroundColor: "#FFFFFF", padding: 4, borderRadius: 10 }}>
                  <Logo brand={brand} size={32} />
                </View>
              ) : null}
              <View>
                <Text style={{ fontFamily: f.bold, fontSize: 13, color: p.primary }}>{brand.name}</Text>
                <Text style={{ fontFamily: f.regular, fontSize: 7.5, color: p.muted, maxWidth: 280 }}>{contact}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: p.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontFamily: f.bold, fontSize: 8.5, color: p.onAccent }}>{reference}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: f.bold, fontSize: 19, color: p.ink, marginTop: 12 }}>{title}</Text>
          <Text style={{ fontFamily: f.regular, fontSize: 9, color: p.muted, marginTop: 1 }}>{subtitle ? `${subtitle}  •  ` : ""}{dateLabel}</Text>
        </View>
      );
  }
}

function Footer({ theme, palette: p, brand, reference, sample }: ShellProps) {
  const f = fontsFor(theme);
  return (
    <View
      fixed
      style={{
        position: "absolute",
        // Le pied de page reste à l'intérieur du cadre et à droite de la bande latérale.
        left: LEFT + (theme.frame ? 14 : 0) + (theme.sideBand ? 10 : 0),
        right: RIGHT + (theme.frame ? 14 : 0),
        bottom: 22 + (theme.frame ? 18 : 0),
      }}
    >
      {sample ? (
        <Text style={{ fontFamily: f.bold, fontSize: 7, color: p.secondary, textAlign: "center", marginBottom: 3, letterSpacing: 0.6 }}>
          APERÇU AVEC DES DONNÉES D&apos;EXEMPLE — SANS VALEUR
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: p.line, paddingTop: 4 }}>
        <Text style={{ fontFamily: f.regular, fontSize: 7, color: p.muted }}>
          {brand.name}  •  {reference}
        </Text>
        <Text style={{ fontFamily: f.regular, fontSize: 7, color: p.muted }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );
}

/** Page(s) A4 d'un document : décor selon l'habillage, puis le corps. */
export function DocumentShell(props: ShellProps) {
  const { theme, palette: p, children, sidebar, after } = props;
  const f = fontsFor(theme);
  const inset = theme.frame ? 14 : 0;
  return (
    <Page
      size="A4"
      style={{
        fontFamily: f.regular,
        fontSize: 9.2,
        color: p.ink,
        // Pas d'interligne global : il serait converti en une valeur fixe (≈ 13 pt) héritée par les
        // grands titres, qui se chevaucheraient. L'interligne se pose sur les textes courants.
        paddingTop: TOP + inset,
        paddingBottom: 60 + inset,
        paddingLeft: LEFT + inset + (theme.sideBand ? 10 : 0),
        paddingRight: RIGHT + inset,
        backgroundColor: "#FFFFFF",
      }}
    >
      {theme.sideBand ? <View fixed style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, backgroundColor: p.primary }} /> : null}
      {theme.frame ? (
        <>
          <View fixed style={{ position: "absolute", left: 18, right: 18, top: 18, bottom: 18, borderWidth: 1.4, borderColor: p.primary }} />
          <View fixed style={{ position: "absolute", left: 23, right: 23, top: 23, bottom: 23, borderWidth: 0.5, borderColor: p.primary }} />
        </>
      ) : null}

      <Header {...props} />

      {sidebar ? (
        <View style={{ flexDirection: "row", gap: 18 }} wrap={false}>
          <View style={{ width: 150 }}>{sidebar}</View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      ) : (
        children
      )}
      {after}

      <Footer {...props} />
    </Page>
  );
}
