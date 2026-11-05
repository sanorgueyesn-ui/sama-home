import test from "node:test";
import assert from "node:assert/strict";
import { daysLeft, isRenewalLocked } from "../subscription-lock";

const NOW = new Date("2026-11-05T12:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 3600 * 1000);

test("essai gratuit (aucun règlement confirmé) : jamais verrouillé", () => {
  assert.equal(isRenewalLocked({ confirmedPayments: 0, currentPeriodEnd: inDays(20) }, NOW), false);
});

test("abonnement payé en cours : verrouillé jusqu'à l'échéance", () => {
  assert.equal(isRenewalLocked({ confirmedPayments: 1, currentPeriodEnd: inDays(30) }, NOW), true);
  assert.equal(isRenewalLocked({ confirmedPayments: 3, currentPeriodEnd: inDays(1) }, NOW), true);
});

test("à l'échéance exacte et après : le paiement se rouvre", () => {
  assert.equal(isRenewalLocked({ confirmedPayments: 1, currentPeriodEnd: NOW }, NOW), false);
  assert.equal(isRenewalLocked({ confirmedPayments: 1, currentPeriodEnd: inDays(-2) }, NOW), false);
});

test("sans abonnement (pas d'échéance) : pas de verrou", () => {
  assert.equal(isRenewalLocked({ confirmedPayments: 2, currentPeriodEnd: null }, NOW), false);
});

test("jours restants : arrondi au-dessus, 0 si passé ou absent", () => {
  assert.equal(daysLeft(inDays(30), NOW), 30);
  assert.equal(daysLeft(new Date(NOW.getTime() + 3600 * 1000), NOW), 1);
  assert.equal(daysLeft(inDays(-1), NOW), 0);
  assert.equal(daysLeft(null, NOW), 0);
});
