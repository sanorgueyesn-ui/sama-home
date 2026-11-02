// Folio (extras d'un séjour hôtelier) : règles pures, aucune base. Le serveur revalide tout : ce qui
// vient du navigateur n'est jamais cru.

export const FOLIO_PRESETS = ["Restaurant", "Boissons", "Petit-déjeuner", "Blanchisserie", "Transport", "Remise"] as const;

export const FOLIO_MAX_ABS_AMOUNT = 10_000_000;
export const FOLIO_LABEL_MAX = 60;
export const FOLIO_REASON_MAX = 200;

export type ParsedCharge = { label: string; amount: number; reason: string | null };

export type ChargeParse = { ok: true; value: ParsedCharge } | { ok: false; error: string };

/**
 * Une ligne positive ajoute un extra. Une ligne négative (remise ou correction) exige un motif :
 * on ne supprime jamais une ligne, on la compense par une nouvelle.
 */
export function parseCharge(input: { label: unknown; amount: unknown; reason?: unknown }): ChargeParse {
  const label = typeof input.label === "string" ? input.label.trim().replace(/\s+/g, " ") : "";
  if (label.length < 2) return { ok: false, error: "Indiquez ce qui est facturé (2 caractères minimum)." };
  if (label.length > FOLIO_LABEL_MAX) return { ok: false, error: `Libellé trop long (${FOLIO_LABEL_MAX} caractères maximum).` };

  const raw = typeof input.amount === "number" ? String(input.amount) : typeof input.amount === "string" ? input.amount.replace(/[\s ]/g, "") : "";
  if (!/^-?\d+$/.test(raw)) return { ok: false, error: "Le montant doit être un nombre entier de FCFA." };
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount === 0) return { ok: false, error: "Le montant ne peut pas être zéro." };
  if (Math.abs(amount) > FOLIO_MAX_ABS_AMOUNT) return { ok: false, error: "Montant trop élevé." };

  const reason = typeof input.reason === "string" ? input.reason.trim().replace(/\s+/g, " ") : "";
  if (reason.length > FOLIO_REASON_MAX) return { ok: false, error: `Motif trop long (${FOLIO_REASON_MAX} caractères maximum).` };
  if (amount < 0 && reason.length < 3) return { ok: false, error: "Une remise ou une correction demande un motif." };

  return { ok: true, value: { label, amount, reason: reason || null } };
}

/** Le total du séjour ne peut jamais devenir négatif, ni passer sous ce qui est déjà encaissé. */
export function chargeKeepsTotalValid(currentTotal: number, alreadyPaid: number, amount: number): boolean {
  const next = currentTotal + amount;
  return next >= 0 && next >= Math.min(alreadyPaid, currentTotal);
}
