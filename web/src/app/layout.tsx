import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSessionCookiePayload } from "@/lib/session-token";
import { getCurrentUserOrNull } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { getTheme } from "@/lib/theme";
import { resolveBrandColors, DEFAULT_BRAND_COLORS } from "@/lib/brand-colors";
import { ShellSwitcher } from "@/components/shell-switcher";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Audit Client/Réservation, Bloc 6 — présence du cookie signé utilisée
  // UNIQUEMENT pour décider d'afficher le chrome de navigation (cosmétique).
  // Ce n'est jamais un mécanisme d'autorisation : chaque page continue de
  // s'appuyer sur verifySession()/getCurrentUser() (src/lib/dal.ts), seuls
  // contrôles authentifiants réels. Un cookie absent/invalide (ex. /login)
  // masque simplement la navigation, sans jamais court-circuiter l'accès.
  const [payload, theme, currentUser] = await Promise.all([
    getSessionCookiePayload(),
    getTheme(),
    getCurrentUserOrNull(),
  ]);
  const showChrome = Boolean(payload?.sessionId);

  // Lot "Personnalisation des couleurs" / Phase 3F Lot D12-E — contrairement
  // à `showChrome` ci-dessus (cookie seul, cosmétique), les paramètres ne
  // sont chargés que si `getCurrentUserOrNull()` confirme une session
  // réellement valide ET un établissement associé (jamais la simple
  // présence du cookie, jamais une redirection — getCurrentUserOrNull()
  // retourne `null` dans tous les autres cas, y compris /login/register).
  // getSettings() résout alors TOUJOURS les paramètres de ce même
  // établissement (requireAdmin()/getCurrentUser() y sont mémoïsés par
  // cache() pour cette requête — aucun second appel réel, aucun risque de
  // redirection puisqu'un utilisateur valide vient déjà d'être confirmé
  // ci-dessus). Sans session valide, sans utilisateur ou sans établissement
  // associé (ex. /login, /register, ou un futur compte de plateforme), on
  // reste sur `DEFAULT_BRAND_COLORS` — jamais les paramètres d'un autre
  // établissement.
  const brandColors = currentUser?.establishmentId
    ? resolveBrandColors(await getSettings())
    : DEFAULT_BRAND_COLORS;
  const brandColorVars = {
    "--color-navy": brandColors.primary,
    "--color-coral": brandColors.secondary,
    "--color-brand-orange": brandColors.accent,
  } as CSSProperties;

  return (
    // Lot "Apparence" — thème lu depuis un cookie côté serveur (src/lib/theme.ts),
    // AVANT ce premier rendu : le HTML streamé porte déjà le bon data-theme,
    // donc aucun flash d'un thème incorrect au chargement (voir Paramètres >
    // Apparence pour le sélecteur). Lot "Personnalisation des couleurs" :
    // `style` injecte les 3 variables CSS déjà existantes (jamais une
    // nouvelle variable, jamais touché le mécanisme clair/sombre lui-même).
    <html
      lang="fr"
      data-theme={theme}
      className={`${plusJakartaSans.variable} h-full antialiased`}
      style={brandColorVars}
    >
      <body className="min-h-full flex flex-col bg-surface text-fg">
        {/* D12-P206 — la sélection AppShell/PlatformShell est déléguée à
            ShellSwitcher (composant client, usePathname()) : voir son
            commentaire pour la raison (le calcul ne peut pas rester ici,
            ce layout racine n'étant pas ré-exécuté lors d'une navigation
            côté client entre les routes métier et /plateforme). */}
        <ShellSwitcher showChrome={showChrome} isPlatformAdmin={currentUser?.isPlatformAdmin ?? false}>
          {children}
        </ShellSwitcher>
      </body>
    </html>
  );
}
