// Folio : validation des extras et des remises. Pur, aucune base.
import test from "node:test";
import assert from "node:assert/strict";
import { chargeKeepsTotalValid, parseCharge } from "../folio";

test("un extra valide est accepté et nettoyé", () => {
  const r = parseCharge({ label: "  Petit   déjeuner ", amount: "5 000" });
  assert.deepEqual(r, { ok: true, value: { label: "Petit déjeuner", amount: 5000, reason: null } });
});

test("montant : entier non nul, borné, jamais décimal ni texte", () => {
  for (const amount of ["", "0", "-0", "12,5", "abc", "1e3", "99999999999", undefined, null]) {
    assert.equal(parseCharge({ label: "Boissons", amount }).ok, false, `refuse ${String(amount)}`);
  }
  assert.equal(parseCharge({ label: "Boissons", amount: 10_000_001 }).ok, false);
  assert.equal(parseCharge({ label: "Boissons", amount: 10_000_000 }).ok, true);
});

test("libellé obligatoire et borné", () => {
  assert.equal(parseCharge({ label: "", amount: 1000 }).ok, false);
  assert.equal(parseCharge({ label: "a", amount: 1000 }).ok, false);
  assert.equal(parseCharge({ label: "x".repeat(61), amount: 1000 }).ok, false);
  assert.equal(parseCharge({ label: 42, amount: 1000 }).ok, false);
});

test("une remise (montant négatif) exige un motif", () => {
  assert.equal(parseCharge({ label: "Remise", amount: -2000 }).ok, false);
  assert.equal(parseCharge({ label: "Remise", amount: -2000, reason: "  " }).ok, false);
  const r = parseCharge({ label: "Remise", amount: "-2000", reason: "Geste commercial" });
  assert.deepEqual(r, { ok: true, value: { label: "Remise", amount: -2000, reason: "Geste commercial" } });
});

test("le total ne devient jamais négatif ni inférieur à ce qui est déjà payé", () => {
  assert.equal(chargeKeepsTotalValid(50_000, 0, 5_000), true);
  assert.equal(chargeKeepsTotalValid(50_000, 20_000, -30_000), true);
  assert.equal(chargeKeepsTotalValid(50_000, 20_000, -30_001), false);
  assert.equal(chargeKeepsTotalValid(50_000, 50_000, -1), false);
  assert.equal(chargeKeepsTotalValid(1_000, 0, -2_000), false);
});
