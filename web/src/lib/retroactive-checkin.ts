/**
 * Arrivée rétroactive (Bloc 21) — règle validée : une arrivée réelle peut
 * être enregistrée jusqu'à 24h après coup, jamais dans le futur, et exige
 * une justification dès qu'elle sort de la tolérance technique normale.
 * Fonction pure, sans dépendance Prisma/server-only (même principe que
 * src/lib/identity.ts) : importable depuis une action serveur (source de
 * vérité) ET depuis un composant client (retour visuel immédiat, jamais la
 * validation réelle).
 */
export const MAX_RETROACTIVE_HOURS = 24;
/** Marge technique couvrant le délai normal de soumission d'un formulaire —
 * en dessous de ce seuil, une arrivée n'est pas considérée comme
 * "rétroactive" (pas de bandeau, pas de justification exigée). */
export const RETROACTIVE_TOLERANCE_MINUTES = 2;

export type RetroactiveCheckResult =
  | { ok: true; isRetroactive: boolean }
  | { ok: false; message: string };

export function checkRetroactiveArrival(
  now: Date,
  actualArrivalAt: Date,
  reason?: string,
): RetroactiveCheckResult {
  const toleranceMs = RETROACTIVE_TOLERANCE_MINUTES * 60_000;
  // Positif = dans le passé, négatif = dans le futur.
  const diffMs = now.getTime() - actualArrivalAt.getTime();

  if (diffMs < -toleranceMs) {
    return { ok: false, message: "L'heure d'arrivée ne peut pas être dans le futur." };
  }
  if (diffMs > MAX_RETROACTIVE_HOURS * 3600_000) {
    return {
      ok: false,
      message: `Une arrivée ne peut pas être enregistrée plus de ${MAX_RETROACTIVE_HOURS} heures après coup.`,
    };
  }

  const isRetroactive = diffMs > toleranceMs;
  if (isRetroactive && (!reason || reason.trim().length === 0)) {
    return { ok: false, message: "Une justification est obligatoire pour une arrivée rétroactive." };
  }

  return { ok: true, isRetroactive };
}
