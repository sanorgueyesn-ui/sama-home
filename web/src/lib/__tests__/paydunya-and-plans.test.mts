// Paiement en ligne PayDunya et formules : configuration, hash du message, prix et plafonds.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { expectedIpnHash, getPaydunyaConfig, isValidIpnHash, readIpnToken } from "../paydunya";
import { categoryOfMode, isBillingCycle, isOverCap, isPlanTier, planCaps, planOffer } from "../subscription-plans";

test("configuration : absente sans les trois clés, test par défaut, réel seulement si demandé", () => {
  assert.equal(getPaydunyaConfig({}), null);
  assert.equal(getPaydunyaConfig({ PAYDUNYA_MASTER_KEY: "m", PAYDUNYA_PRIVATE_KEY: "p" }), null);
  const base = { PAYDUNYA_MASTER_KEY: "m", PAYDUNYA_PRIVATE_KEY: "p", PAYDUNYA_TOKEN: "t" };
  assert.equal(getPaydunyaConfig(base)?.mode, "test");
  assert.equal(getPaydunyaConfig({ ...base, PAYDUNYA_MODE: "live" })?.mode, "live");
  assert.equal(getPaydunyaConfig({ ...base, PAYDUNYA_MODE: "n'importe quoi" })?.mode, "test");
});

test("hash du message : SHA-512 de la clé maître, comparaison stricte", () => {
  const expected = createHash("sha512").update("cle-maitre").digest("hex");
  assert.equal(expectedIpnHash("cle-maitre"), expected);
  assert.equal(isValidIpnHash(expected, "cle-maitre"), true);
  assert.equal(isValidIpnHash(expected.toUpperCase(), "cle-maitre"), true);
  assert.equal(isValidIpnHash(expected, "autre-cle"), false);
  assert.equal(isValidIpnHash("abc", "cle-maitre"), false);
  assert.equal(isValidIpnHash(undefined, "cle-maitre"), false);
  assert.equal(isValidIpnHash(null, "cle-maitre"), false);
});

test("message IPN : jeton et hash lus dans les clés imbriquées", () => {
  const form = new FormData();
  form.set("data[invoice][token]", "tok_123");
  form.set("data[hash]", "h");
  assert.deepEqual(readIpnToken(form), { token: "tok_123", hash: "h" });
  assert.deepEqual(readIpnToken(new FormData()), { token: null, hash: null });
});

test("formules : prix et durée viennent de la grille, jamais du client", () => {
  const monthly = planOffer("RESIDENCE", "ESSENTIAL", "monthly");
  const annual = planOffer("RESIDENCE", "ESSENTIAL", "annual");
  assert.equal(monthly?.amountFcfa, 4950);
  assert.equal(monthly?.periodMonths, 1);
  assert.equal(annual?.amountFcfa, 54450); // 11 mensualités
  assert.equal(annual?.periodMonths, 12);
  assert.equal(categoryOfMode("HOTEL"), "hotel");
  assert.equal(categoryOfMode("REAL_ESTATE"), "agency");
  assert.equal(isPlanTier("GOLD"), false);
  assert.equal(isBillingCycle("weekly"), false);
});

test("plafonds : lus dans la grille, illimité = aucun plafond", () => {
  assert.deepEqual(planCaps("RESIDENCE", "ESSENTIAL"), { units: 10, users: 3 });
  assert.deepEqual(planCaps("RESIDENCE", "PRO"), { units: 30, users: 10 });
  assert.deepEqual(planCaps("RESIDENCE", "PREMIUM"), { units: null, users: null });
});

test("plafond atteint : seule une nouvelle création est refusée", () => {
  assert.equal(isOverCap(9, 10), false);
  assert.equal(isOverCap(10, 10), true);
  assert.equal(isOverCap(500, null), false);
});
