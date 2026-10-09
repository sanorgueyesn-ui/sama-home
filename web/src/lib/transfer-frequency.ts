import type { TransferFrequency } from "@/generated/prisma/client";

/**
 * Avance `current` d'EXACTEMENT une période selon `frequency` — toujours à
 * partir de l'échéance précédemment traitée, jamais à partir de `now` : un
 * rattrapage multi-échéances (voir `catchUpSchedule`,
 * src/lib/transfer-schedule-engine.ts) appelle cette fonction une fois par
 * échéance, dans l'ordre chronologique, pour ne jamais sauter ni répéter
 * une période. Fonction pure, sans dépendance Prisma/server-only (même
 * principe que src/lib/identity.ts et src/lib/retroactive-checkin.ts) —
 * testable isolément, y compris hors du runtime Next.js.
 *
 * `anchorDay` (MONTHLY uniquement) — le jour du mois (1-31) réellement
 * voulu par l'utilisateur, indépendant de tout clampage déjà subi par
 * `current`. Sans lui (undefined/null — programmation créée avant le lot
 * "ancre durable", voir TransferSchedule.anchorDay), on retombe sur
 * l'ANCIEN comportement : dérivé de `current.getDate()`, qui NE PERMET PAS
 * de revenir à un jour plus élevé après un clampage (ex. ancre 31 → 28
 * février → 28 mars au lieu de 31 mars) — connu et documenté, corrigé
 * uniquement quand `anchorDay` est fourni.
 */
export function advanceNextRunAt(current: Date, frequency: TransferFrequency, anchorDay?: number | null): Date {
  const next = new Date(current);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY": {
      const day = anchorDay ?? next.getDate();
      const year = next.getFullYear();
      const targetMonthIndex = next.getMonth() + 1;
      const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0).getDate();
      next.setFullYear(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth));
      break;
    }
  }
  return next;
}

/**
 * Jour d'ancrage à enregistrer à la CRÉATION d'une programmation — toujours
 * dérivé de la date choisie par l'utilisateur, jamais une valeur par
 * défaut inventée.
 */
export function resolveAnchorDayOnCreate(nextRunAt: Date): number {
  return nextRunAt.getDate();
}

/**
 * Jour d'ancrage à enregistrer lors d'une MODIFICATION d'une programmation
 * existante. `updateTransferSchedule` reçoit toujours un `nextRunAt`
 * (même formulaire pour changer la date ET pour changer uniquement le
 * montant/pourcentage/fréquence) : on ne peut donc pas distinguer une
 * vraie intention de déplacer l'échéance d'une simple resoumission de la
 * valeur déjà en place autrement qu'en comparant les deux dates.
 * - `nextRunAt` réellement changé (comparaison par instant exact) → la
 *   nouvelle date devient la nouvelle ancre (modification manuelle
 *   explicite de la date).
 * - `nextRunAt` inchangé (modification du montant, du pourcentage ou de la
 *   fréquence uniquement) → l'ancre existante est conservée telle quelle,
 *   jamais recalculée à partir d'une valeur potentiellement déjà clampée.
 */
export function resolveAnchorDayOnUpdate(
  existingNextRunAt: Date,
  existingAnchorDay: number | null,
  newNextRunAt: Date,
): number {
  if (existingNextRunAt.getTime() !== newNextRunAt.getTime()) {
    return newNextRunAt.getDate();
  }
  return existingAnchorDay ?? existingNextRunAt.getDate();
}
