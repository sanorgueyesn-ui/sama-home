"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { PlatformShell } from "@/components/platform/platform-shell";

/**
 * D12-P206 — remplace la sélection de coquille auparavant faite dans
 * `app/layout.tsx` à partir de l'en-tête `x-pathname` (posé par
 * `src/proxy.ts`). Ce layout racine est partagé par les routes métier ET
 * `/plateforme` : Next.js App Router ne le ré-exécute pas lors d'une
 * navigation côté client (<Link>) entre les deux, donc la coquille restait
 * figée sur sa valeur précédente (cause exacte du rapport D12-P205).
 * `usePathname()` est un hook réactif : il se met à jour à chaque
 * navigation, côté client comme au chargement complet — d'où ce composant
 * client dédié, plutôt qu'un calcul serveur. Jamais un mécanisme
 * d'autorisation : `requirePlatformAdmin()` (src/lib/dal.ts) reste la seule
 * protection réelle de `/plateforme`.
 */
export function ShellSwitcher({
  children,
  showChrome,
  isPlatformAdmin,
}: {
  children: ReactNode;
  showChrome: boolean;
  isPlatformAdmin: boolean;
}) {
  const pathname = usePathname();
  const isPlatformConsole = pathname === "/plateforme" || pathname.startsWith("/plateforme/");

  if (isPlatformConsole) return <PlatformShell>{children}</PlatformShell>;
  if (showChrome) return <AppShell isPlatformAdmin={isPlatformAdmin}>{children}</AppShell>;
  return <>{children}</>;
}
