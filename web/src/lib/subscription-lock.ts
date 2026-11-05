// Verrou de renouvellement : tant qu'un abonnement PAYÉ court encore, on ne peut pas en payer un autre
// (sinon les mois s'empilent par erreur). Il se rouvre à l'expiration. Pendant l'essai gratuit, rien n'est
// verrouillé : le premier paiement reste possible. Module PUR : `now` est fourni par l'appelant.

export type RenewalLockInput = {
  /** Nombre de règlements CONFIRMÉS (paiement en ligne confirmé ou règlement saisi par la plateforme). */
  confirmedPayments: number;
  currentPeriodEnd: Date | null;
};

const DAY_MS = 24 * 3600 * 1000;

export function isRenewalLocked(input: RenewalLockInput, now: Date): boolean {
  return input.confirmedPayments > 0 && input.currentPeriodEnd !== null && input.currentPeriodEnd.getTime() > now.getTime();
}

/** Jours entiers restants (arrondis au-dessus), 0 si l'échéance est passée. */
export function daysLeft(end: Date | null, now: Date): number {
  if (!end) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}
