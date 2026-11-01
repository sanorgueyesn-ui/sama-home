import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";

/**
 * Lot 2 / étape 2c-1 — primitives communes des codes à usage unique (OTP) : inscription et
 * réinitialisation du mot de passe.
 *
 * - Génération : `crypto.randomInt` (source cryptographique), jamais `Math.random`.
 * - Format public INCHANGÉ : exactement 6 chiffres, de 100000 à 999999 (pas de zéro initial,
 *   comme avant ; le format de validation `length(6)` des formulaires reste valable).
 * - Comparaison : en temps constant, après validation stricte du format ; jamais d'exception
 *   sur une entrée mal formée (elle est simplement refusée).
 */
export const OTP_LENGTH = 6;
/** Nombre maximal d'essais évalués par code, quelle que soit la concurrence. */
export const OTP_MAX_ATTEMPTS = 5;

const OTP_MIN = 10 ** (OTP_LENGTH - 1); // 100000
const OTP_MAX_EXCLUSIVE = 10 ** OTP_LENGTH; // 1000000

const OTP_PATTERN = /^[0-9]{6}$/;

export function generateOtpCode(): string {
  return randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE).toString();
}

/** Vrai uniquement pour une chaîne de exactement 6 chiffres ASCII. */
export function isWellFormedOtp(value: unknown): value is string {
  return typeof value === "string" && OTP_PATTERN.test(value);
}

/**
 * Compare un code attendu et un code fourni en temps constant. Retourne `false` (sans lever)
 * si l'une des deux valeurs n'est pas un code bien formé, ce qui garantit des tampons de même
 * longueur pour `timingSafeEqual`.
 */
export function safeEqualOtp(expected: unknown, provided: unknown): boolean {
  if (!isWellFormedOtp(expected) || !isWellFormedOtp(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
}
