/**
 * Lot 3B, étape A — règles PURES de validation des paiements manuels, prolongations et
 * remboursements d'abonnement. Module pur : aucun accès base, aucun `server-only`, aucune
 * dépendance (importable aussi par les composants client, comme `pricing-defaults.ts`).
 *
 * Ces fonctions ne sont pas encore appelées par les actions serveur ; elles fixent les règles
 * validées. Elles ne remplacent jamais la validation côté serveur : les actions devront les
 * appeler avant toute écriture.
 *
 * Toutes les entrées sont de type `unknown` : une valeur venue du client n'est jamais supposée
 * conforme. Aucune conversion implicite (une chaîne comme "9900" est REFUSÉE ; la conversion,
 * si elle est voulue, se fait avant, explicitement, chez l'appelant).
 */

/** Paiement manuel : montant entier de 100 à 10 000 000 FCFA, bornes incluses. */
export const MANUAL_PAYMENT_MIN_FCFA = 100;
export const MANUAL_PAYMENT_MAX_FCFA = 10_000_000;

/** Paiement manuel : durée créditée, entier de 1 à 36 mois, bornes incluses. */
export const MANUAL_PAYMENT_MIN_MONTHS = 1;
export const MANUAL_PAYMENT_MAX_MONTHS = 36;

/** Prolongation manuelle : durée exprimée EXCLUSIVEMENT en jours, entier de 1 à 366, bornes incluses. */
export const PROLONGATION_MIN_DAYS = 1;
export const PROLONGATION_MAX_DAYS = 366;

/**
 * Seuil initial de double validation d'un remboursement : 50 000 FCFA INCLUS. Le flux de
 * remboursement lui-même n'existe pas encore ; le seuil pourra devenir configurable plus tard
 * (aucun paramètre n'existe aujourd'hui).
 */
export const REFUND_DOUBLE_VALIDATION_THRESHOLD_FCFA = 50_000;

/** Longueurs maximales (en caractères Unicode) — identiques aux contraintes SQL prévues. */
export const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 64;
export const REFERENCE_MAX_LENGTH = 200;
export const REASON_MAX_LENGTH = 500;

export type RuleResult<T> = { valid: true; value: T } | { valid: false; error: string };

function validateBoundedInteger(value: unknown, min: number, max: number, label: string): RuleResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isSafeInteger(value)) {
    return { valid: false, error: `${label} doit être un nombre entier.` };
  }
  if (value < min || value > max) {
    return { valid: false, error: `${label} doit être compris entre ${min} et ${max} (inclus).` };
  }
  return { valid: true, value };
}

export function validateManualPaymentAmountFcfa(value: unknown): RuleResult<number> {
  return validateBoundedInteger(value, MANUAL_PAYMENT_MIN_FCFA, MANUAL_PAYMENT_MAX_FCFA, "Le montant (FCFA)");
}

/** Durée (en mois) créditée par un PAIEMENT MANUEL — ne concerne pas la prolongation (jours). */
export function validateManualPaymentMonths(value: unknown): RuleResult<number> {
  return validateBoundedInteger(
    value,
    MANUAL_PAYMENT_MIN_MONTHS,
    MANUAL_PAYMENT_MAX_MONTHS,
    "La durée du paiement (en mois)",
  );
}

export function validateProlongationDays(value: unknown): RuleResult<number> {
  return validateBoundedInteger(value, PROLONGATION_MIN_DAYS, PROLONGATION_MAX_DAYS, "La durée en jours");
}

/** Longueur en caractères Unicode (points de code), comme `char_length` de PostgreSQL. */
function codePointLength(text: string): number {
  return Array.from(text).length;
}

// Le caractère NUL ne peut pas être stocké dans un champ texte PostgreSQL.
const NUL_CHARACTER = String.fromCharCode(0);

/**
 * Texte libre : refuse tout ce qui n'est pas une chaîne, tout caractère NUL, et toute chaîne
 * trop longue APRÈS suppression des espaces de début et de fin. Retourne le texte nettoyé.
 */
function validateText(
  value: unknown,
  maxLength: number,
  label: string,
): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof value !== "string") {
    return { valid: false, error: `${label} doit être un texte.` };
  }
  if (value.includes(NUL_CHARACTER)) {
    return { valid: false, error: `${label} contient un caractère interdit.` };
  }
  const trimmed = value.trim();
  if (codePointLength(trimmed) > maxLength) {
    return { valid: false, error: `${label} ne peut pas dépasser ${maxLength} caractères.` };
  }
  return { valid: true, value: trimmed };
}

function validateOptionalText(value: unknown, maxLength: number, label: string): RuleResult<string | null> {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }
  const result = validateText(value, maxLength, label);
  if (!result.valid) return result;
  // Une chaîne vide ou composée uniquement d'espaces équivaut à l'absence de valeur.
  return { valid: true, value: result.value === "" ? null : result.value };
}

/** Justificatif libre (Wave, Orange Money, espèces…) : facultatif, 200 caractères au plus. */
export function validateReference(value: unknown): RuleResult<string | null> {
  return validateOptionalText(value, REFERENCE_MAX_LENGTH, "La référence");
}

/** Motif général d'une demande : facultatif, 500 caractères au plus. */
export function validateReason(value: unknown): RuleResult<string | null> {
  return validateOptionalText(value, REASON_MAX_LENGTH, "Le motif");
}

/** Motif de rejet : OBLIGATOIRE, non vide après suppression des espaces, 500 caractères au plus. */
export function validateRejectionReason(value: unknown): RuleResult<string> {
  const result = validateText(value, REASON_MAX_LENGTH, "Le motif de rejet");
  if (!result.valid) return result;
  if (result.value === "") {
    return { valid: false, error: "Un motif de rejet est obligatoire." };
  }
  return result;
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Clé d'idempotence fournie par le formulaire : 16 à 64 caractères parmi lettres, chiffres,
 * tiret et tiret bas. Aucune normalisation (une clé avec espaces est refusée, pas nettoyée).
 */
export function validateIdempotencyKey(value: unknown): RuleResult<string> {
  if (typeof value !== "string") {
    return { valid: false, error: "La clé d'idempotence doit être un texte." };
  }
  if (
    value.length < IDEMPOTENCY_KEY_MIN_LENGTH ||
    value.length > IDEMPOTENCY_KEY_MAX_LENGTH ||
    !IDEMPOTENCY_KEY_PATTERN.test(value)
  ) {
    return {
      valid: false,
      error: `La clé d'idempotence doit contenir de ${IDEMPOTENCY_KEY_MIN_LENGTH} à ${IDEMPOTENCY_KEY_MAX_LENGTH} caractères (lettres, chiffres, - et _).`,
    };
  }
  return { valid: true, value };
}

/**
 * Un remboursement de 50 000 FCFA ou plus exige deux validations par des administrateurs
 * distincts. Retourne `true` à partir du seuil (inclus).
 *
 * Comportement de sécurité : une valeur qui n'est pas un montant entier strictement positif
 * (décimal, négatif, zéro, chaîne, `null`, `NaN`, infini…) retourne `true` — jamais un
 * contournement de la double validation par une entrée invalide. La validité du montant
 * reste à contrôler séparément.
 */
export function refundRequiresDoubleValidation(amountFcfa: unknown): boolean {
  if (typeof amountFcfa !== "number" || !Number.isSafeInteger(amountFcfa) || amountFcfa <= 0) {
    return true;
  }
  return amountFcfa >= REFUND_DOUBLE_VALIDATION_THRESHOLD_FCFA;
}

/**
 * Séparation des rôles pour toute décision sur une demande (approbation, rejet) : le demandeur
 * n'est jamais le décideur. Retourne `true` UNIQUEMENT si les deux identités sont des chaînes
 * non vides (hors espaces) et différentes (comparaison exacte, sensible à la casse, sans
 * normalisation). Une identité absente ou invalide retourne `false` : la décision est refusée
 * par défaut, jamais accordée par défaut.
 *
 * L'annulation par le demandeur lui-même suit une règle inverse (identités ÉGALES) et n'est
 * pas couverte par cette fonction.
 */
export function areRequesterAndDeciderDistinct(requesterId: unknown, deciderId: unknown): boolean {
  if (typeof requesterId !== "string" || typeof deciderId !== "string") return false;
  if (requesterId.trim() === "" || deciderId.trim() === "") return false;
  return requesterId !== deciderId;
}
