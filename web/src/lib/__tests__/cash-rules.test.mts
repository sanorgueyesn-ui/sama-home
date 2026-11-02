// Clôture de caisse : l'écart porte sur les espèces ; l'ancienne règle reste lisible pour l'historique.
import test from "node:test";
import assert from "node:assert/strict";
import { cashVariance, nextOpeningBalance, varianceBase } from "../cash-rules";

test("règle actuelle : le mobile money ne crée jamais d'écart", () => {
  // Ouverture 50 000 + espèces 30 000 + Wave 20 000 : total 100 000, espèces attendues 80 000.
  const session = { physicalCount: 80_000, closingTheoreticalBalance: 100_000, closingExpectedCash: 80_000 };
  assert.equal(cashVariance(session.physicalCount, varianceBase(session)), 0);
});

test("règle actuelle : un manque d'espèces est un écart, le mobile money reste dans le solde", () => {
  const session = { physicalCount: 78_000, closingTheoreticalBalance: 100_000, closingExpectedCash: 80_000 };
  assert.equal(cashVariance(session.physicalCount, varianceBase(session)), -2_000);
  // 100 000 attendus au total, 2 000 d'espèces manquent : la session suivante ouvre à 98 000.
  assert.equal(nextOpeningBalance(session), 98_000);
});

test("règle actuelle : sans comptage, l'ouverture suivante reprend le solde théorique", () => {
  assert.equal(nextOpeningBalance({ physicalCount: null, closingTheoreticalBalance: 100_000, closingExpectedCash: 80_000 }), 100_000);
  assert.equal(cashVariance(null, 80_000), null);
});

test("ancienne règle (espèces attendues absentes) : écart contre le total, ouverture = comptage", () => {
  const legacy = { physicalCount: 95_000, closingTheoreticalBalance: 100_000, closingExpectedCash: null };
  assert.equal(varianceBase(legacy), 100_000);
  assert.equal(cashVariance(legacy.physicalCount, varianceBase(legacy)), -5_000);
  assert.equal(nextOpeningBalance(legacy), 95_000);
  assert.equal(nextOpeningBalance({ ...legacy, physicalCount: null }), 100_000);
});

test("session jamais clôturée : pas de solde d'ouverture suivant", () => {
  assert.equal(nextOpeningBalance({ physicalCount: null, closingTheoreticalBalance: null, closingExpectedCash: null }), null);
  assert.equal(varianceBase({ closingTheoreticalBalance: null, closingExpectedCash: null }), null);
});
