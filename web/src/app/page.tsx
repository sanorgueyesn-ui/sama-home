import { LandingView } from "@/components/landing/landing-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SAMA HOME — Logiciel Tout-en-Un de Gestion Hôtelière & Immobilière au Sénégal",
  description:
    "Pilotez vos résidences meublées, hôtels, auberges et appartements Airbnb à Dakar et au Sénégal. Réservations, séjours, contrats 1-clic, Wave/Orange Money et caisse étanche en temps réel.",
};

export default function RootHomePage() {
  return <LandingView />;
}
