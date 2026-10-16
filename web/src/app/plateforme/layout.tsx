import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/dal";

/**
 * Phase 3G / Lot D12-P86 — garde serveur réelle pour TOUTE l'arborescence
 * `/plateforme/*` : redirige vers "/" si `isPlatformAdmin !== true`, avant
 * le rendu de n'importe quelle page de cette section — même garde que
 * chaque page individuelle (`requirePlatformAdmin()` re-vérifiée par
 * chacune, défense en profondeur déjà établie), ici posée une fois pour
 * toute la section plutôt que dupliquée manuellement à chaque nouvelle
 * page future. La coquille visuelle (PlatformShell) est choisie séparément
 * par src/app/layout.tsx selon le chemin — ce layout n'a qu'un rôle
 * d'autorisation, jamais de rendu de navigation.
 */
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();
  return children;
}
