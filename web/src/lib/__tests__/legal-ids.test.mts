// NINEA et RCCM de l'établissement : facultatifs, nettoyés, jamais n'importe quoi.
import test from "node:test";
import assert from "node:assert/strict";
import { SettingsSchema } from "../definitions";

// Comme `FormData.get` : un champ absent du formulaire vaut `null`, jamais « undefined ».
const base = { establishmentName: "Hôtel Test", phone: "+221773386660", address: "Dakar", description: null, whatsappTemplate: null, ninea: null, rccm: null };
const parse = (extra: Record<string, unknown>) => SettingsSchema.safeParse({ ...base, ...extra });

test("NINEA et RCCM vides ou absents : null (efface la valeur), jamais une erreur", () => {
  for (const extra of [{}, { ninea: "", rccm: "" }, { ninea: "   ", rccm: null }]) {
    const r = parse(extra);
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.ninea, null);
      assert.equal(r.data.rccm, null);
    }
  }
});

test("valeurs réelles acceptées et espaces nettoyés", () => {
  const r = parse({ ninea: "  012521599  2R1 ", rccm: "SN.DKR.2025.A.38803" });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.ninea, "012521599 2R1");
    assert.equal(r.data.rccm, "SN.DKR.2025.A.38803");
  }
});

test("caractères non valides et valeurs trop longues : refusés", () => {
  assert.equal(parse({ ninea: "<script>" }).success, false);
  assert.equal(parse({ ninea: "12; DROP TABLE" }).success, false);
  assert.equal(parse({ ninea: "1".repeat(21) }).success, false);
  assert.equal(parse({ rccm: "A".repeat(41) }).success, false);
});
