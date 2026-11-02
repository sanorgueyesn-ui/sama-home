// Règles de clôture de caisse : pures, sans base. L'écart se mesure sur les ESPÈCES du tiroir : le
// mobile money (Wave, Orange Money) ne se compte pas dans un tiroir et ne doit donc jamais créer
// d'écart. Les sessions clôturées avant cette règle (`closingExpectedCash` nul) gardent leur calcul
// d'origine, contre le solde théorique total.

export type ClosedSessionFigures = {
  physicalCount: number | null;
  closingTheoreticalBalance: number | null;
  closingExpectedCash: number | null;
};

/** Ce à quoi le comptage est comparé : espèces attendues (règle actuelle) ou solde total (historique). */
export function varianceBase(session: Pick<ClosedSessionFigures, "closingTheoreticalBalance" | "closingExpectedCash">): number | null {
  return session.closingExpectedCash ?? session.closingTheoreticalBalance;
}

export function cashVariance(physicalCount: number | null, base: number | null): number | null {
  if (physicalCount === null || base === null) return null;
  return physicalCount - base;
}

/**
 * Solde d'ouverture de la session suivante.
 * - Règle actuelle : solde théorique + écart d'espèces. Les espèces comptées remplacent les espèces
 *   attendues, et le mobile money reste dans le solde (il n'a pas été compté).
 * - Ancienne règle (`closingExpectedCash` nul) : le comptage seul, sinon le solde théorique.
 */
export function nextOpeningBalance(session: ClosedSessionFigures): number | null {
  if (session.closingTheoreticalBalance === null) return null;
  if (session.closingExpectedCash === null) return session.physicalCount ?? session.closingTheoreticalBalance;
  if (session.physicalCount === null) return session.closingTheoreticalBalance;
  return session.closingTheoreticalBalance + (session.physicalCount - session.closingExpectedCash);
}
