import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSessionCookiePayload } from "@/lib/session-token";
import { getCurrentUserOrNull } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { getTheme } from "@/lib/theme";
import { resolveBrandColors, DEFAULT_BRAND_COLORS } from "@/lib/brand-colors";
import { AppShell } from "@/components/navigation/app-shell";
import { PlatformShell } from "@/components/platform/platform-shell";

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
  const [payload, theme, currentUser, headersList] = await Promise.all([
    getSessionCookiePayload(),
    getTheme(),
    getCurrentUserOrNull(),
    headers(),
  ]);
  const showChrome = Boolean(payload?.sessionId);

  // Phase 3G / Lot D12-P86 — sépare la console de plateforme (`/plateforme`
  // et ses sous-pages) de la navigation métier : le chemin ne peut pas être
  // lu directement dans un layout Server Component, d'où l'en-tête
  // `x-pathname` posé par `src/proxy.ts` (jamais un mécanisme
  // d'autorisation — la seule vérification réelle reste
  // `requirePlatformAdmin()`, appelée indépendamment par le layout et les
  // pages de `/plateforme`). Un compte métier qui atteindrait cette URL par
  // erreur verrait au pire la coquille de la console avant d'être
  // immédiatement redirigé par la page elle-même — jamais un accès réel.
  const pathname = headersList.get("x-pathname") ?? "";
  const isPlatformConsole = pathname === "/plateforme" || pathname.startsWith("/plateforme/");

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
        {isPlatformConsole ? (
          // Phase 3G / Lot D12-P86 — jamais AppShell ici : console
          // entièrement distincte, sa propre navigation, son propre thème
          // sombre fixe. `requirePlatformAdmin()` reste la seule
          // autorisation réelle (vérifiée indépendamment par ce composant
          // et par chaque page de /plateforme) — ce rendu ne constitue
          // jamais une protection à lui seul.
          <PlatformShell>{children}</PlatformShell>
        ) : showChrome ? (
          // Phase 3G / Lot D12-P61 — `isPlatformAdmin` déjà résolu ci-dessus
          // par le même appel à getCurrentUserOrNull() (mémoïsé par cache(),
          // aucune requête supplémentaire) : simplement transmis en prop,
          // jamais une nouvelle lecture utilisateur dans AppShell lui-même.
          <AppShell isPlatformAdmin={currentUser?.isPlatformAdmin ?? false}>{children}</AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
