import { LandingView } from "@/components/landing/landing-view";
import { getLocale } from "@/lib/i18n/locale";
import { getTheme } from "@/lib/theme";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAMA HOME — Logiciel Tout-en-Un de Gestion Hôtelière & Immobilière au Sénégal",
  description:
    "Pilotez vos résidences meublées, hôtels, auberges et appartements Airbnb à Dakar et au Sénégal. Réservations, séjours, contrats 1-clic, Wave/Orange Money et caisse étanche en temps réel.",
};

export default async function RootHomePage() {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return <LandingView locale={locale} theme={theme} />;
}
