/**
 * Lot 2 / étape 2a — politique de durée de vie des sessions. Module PUR (aucune dépendance
 * serveur, base ou horloge implicite) : `now` est toujours fourni par l'appelant, ce qui rend
 * les limites exactes testables.
 *
 * Règles (document de référence SAMA HOME v1.0, §2) :
 * - inactivité maximale : 30 minutes ;
 * - durée absolue maximale : 12 heures À PARTIR DE `createdAt`, jamais prolongeable ;
 * - la prolongation n'est écrite en base que si elle fait gagner au moins 60 secondes, pour
 *   limiter les écritures. Conséquence assumée : l'inactivité effective est comprise entre
 *   29 et 30 minutes après la dernière requête.
 *
 * Représentation sans migration : `createdAt` = début absolu ; `expiresAt` = échéance
 * d'inactivité glissante, toujours plafonnée à `createdAt + 12 h`.
 */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Délais d'inactivité proposés à l'administrateur (minutes). 30 = valeur par défaut. */
export const SESSION_IDLE_OPTIONS_MINUTES = [5, 15, 30, 60, 120, 240, 480] as const;
export const DEFAULT_IDLE_MINUTES = 30;

/** Valeur lue ou saisie -> un délai autorisé ; tout le reste retombe sur le défaut (jamais d'erreur ni de 0). */
export function normalizeIdleMinutes(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return (SESSION_IDLE_OPTIONS_MINUTES as readonly number[]).includes(n) ? n : DEFAULT_IDLE_MINUTES;
}
export const SESSION_MAX_MS = 12 * 60 * 60 * 1000;
export const SESSION_TOUCH_MIN_GAIN_MS = 60 * 1000;

export type SessionTimes = { createdAt: Date; expiresAt: Date };

export type SessionEvaluation =
  | { valid: false; reason: "MAX_LIFETIME" | "IDLE" }
  | { valid: true; nextExpiresAt: Date; shouldWrite: boolean };

/** Fin absolue de la session : `createdAt + 12 h`. */
export function getSessionAbsoluteEnd(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_MAX_MS);
}

/**
 * Évalue une session à l'instant `nowMs`. Les comparaisons sont STRICTES : à l'instant exact
 * de la limite, la session est refusée.
 *
 * `shouldWrite` vaut `true` si l'échéance doit être réduite (session créée avant cette règle,
 * dont `expiresAt` dépasse la cible) ou prolongée d'au moins `SESSION_TOUCH_MIN_GAIN_MS`.
 */
export function evaluateSession(session: SessionTimes, nowMs: number, idleMs: number = SESSION_IDLE_MS): SessionEvaluation {
  const absoluteEndMs = getSessionAbsoluteEnd(session.createdAt).getTime();
  if (nowMs >= absoluteEndMs) return { valid: false, reason: "MAX_LIFETIME" };

  const currentMs = session.expiresAt.getTime();
  if (nowMs >= currentMs) return { valid: false, reason: "IDLE" };

  const targetMs = Math.min(nowMs + idleMs, absoluteEndMs);
  const shouldWrite = currentMs > targetMs || targetMs - currentMs >= SESSION_TOUCH_MIN_GAIN_MS;
  return { valid: true, nextExpiresAt: new Date(targetMs), shouldWrite };
}
