"use client";

import { useTransition } from "react";
import { setTheme } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

/**
 * Bascule compacte clair/sombre pour les pages d'authentification — réutilise
 * EXACTEMENT le mécanisme déjà existant (src/app/actions/theme.ts,
 * src/lib/theme.ts), jamais une nouvelle logique de thème. Même esprit que
 * ThemeSection (Paramètres), condensé en un seul bouton icône pour
 * correspondre à l'emplacement de la maquette (coin supérieur droit).
 */
export function ThemeToggleButton({ current }: { current: Theme }) {
  const [pending, startTransition] = useTransition();
  const next: Theme = current === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setTheme(next))}
      aria-label={current === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/15 bg-surface-raised text-fg/70 disabled:opacity-60"
    >
      {current === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
