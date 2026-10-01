import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { getSessionCookiePayload } from "@/lib/session-token";
import { AppShell } from "@/components/navigation/app-shell";

const manrope = Manrope({
  variable: "--font-manrope",
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
    <html lang="fr" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-navy">
        {showChrome ? <AppShell>{children}</AppShell> : children}
      </body>
    </html>
  );
}
