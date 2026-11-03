import { LandingView } from "@/components/landing/landing-view";
import { getLocale } from "@/lib/i18n/locale";
import { getTheme } from "@/lib/theme";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAMA HOME — Gestion de résidences meublées et d'hôtels au Sénégal",
  description:
    "Planning des réservations, séjours, caisse, paiements Wave et Orange Money, contrats et reçus en PDF pour résidences meublées et hôtels. Essai gratuit de 1 mois.",
};

export default async function RootHomePage() {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return <LandingView locale={locale} theme={theme} />;
}
