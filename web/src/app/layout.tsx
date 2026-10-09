import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSessionCookiePayload } from "@/lib/session-token";
import { AppShell } from "@/components/navigation/app-shell";

// Reconstruction UI (Nocturne Opulence) — Plus Jakarta Sans remplace Manrope
// dans toute l'app, conformément au design system validé (PRD section 3).
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SAMA HOME",
  description: "Gestion simple de vos chambres meublées et appartements.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Audit Client/Réservation, Bloc 6 — présence du cookie signé utilisée
  // UNIQUEMENT pour décider d'afficher le chrome de navigation (cosmétique).
  // Ce n'est jamais un mécanisme d'autorisation : chaque page continue de
  // s'appuyer sur verifySession()/getCurrentUser() (src/lib/dal.ts), seuls
  // contrôles authentifiants réels. Un cookie absent/invalide (ex. /login)
  // masque simplement la navigation, sans jamais court-circuiter l'accès.
  const payload = await getSessionCookiePayload();
  const showChrome = Boolean(payload?.sessionId);

  return (
    // Reconstruction UI — SAMA HOME = dark premium par défaut (pas de
    // sélecteur de thème pour ce lot ; voir Paramètres > Apparence &
    // Logo, lot ultérieur, pour une préférence réglable).
    <html lang="fr" data-theme="dark" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-fg">
        {showChrome ? <AppShell>{children}</AppShell> : children}
      </body>
    </html>
  );
}
