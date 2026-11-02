// Contrat de location : le bailleur est l'établissement. Jamais les coordonnées de SAMA HOME, jamais
// de valeur de repli inventée. Règle pure + garde de source ; aucune base.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveContractLessor } from "../contract-settings";

const complete = {
  establishmentName: "Résidence Teranga Almadies",
  phone: "+221 77 111 22 33",
  secondaryPhone: "+221 76 444 55 66",
  address: "Almadies, Dakar",
  email: "contact@teranga.example",
};

test("coordonnées complètes : le bailleur est l'établissement, tel qu'enregistré", () => {
  const result = resolveContractLessor(complete, "Autre nom");
  assert.deepEqual(result, { ok: true, lessor: complete });
});

test("valeurs nettoyées ; optionnels vides → null, jamais une valeur de repli", () => {
  const result = resolveContractLessor({ ...complete, establishmentName: "  Teranga  ", secondaryPhone: "  ", email: "" }, null);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lessor.establishmentName, "Teranga");
    assert.equal(result.lessor.secondaryPhone, null);
    assert.equal(result.lessor.email, null);
  }
});

test("nom absent des paramètres : on prend le nom enregistré de l'établissement, pas celui de SAMA HOME", () => {
  const result = resolveContractLessor({ ...complete, establishmentName: "" }, "Hôtel du Port");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.lessor.establishmentName, "Hôtel du Port");
});

test("paramètres jamais renseignés : refus, avec la liste de ce qui manque", () => {
  assert.deepEqual(resolveContractLessor(null, null), { ok: false, missing: ["name", "phone", "address"] });
  assert.deepEqual(resolveContractLessor(null, "Hôtel du Port"), { ok: false, missing: ["phone", "address"] });
});

test("téléphone ou adresse vide ou blanc : refus ciblé", () => {
  assert.deepEqual(resolveContractLessor({ ...complete, phone: "   " }, "X"), { ok: false, missing: ["phone"] });
  assert.deepEqual(resolveContractLessor({ ...complete, address: "" }, "X"), { ok: false, missing: ["address"] });
  assert.deepEqual(resolveContractLessor({ ...complete, phone: null, address: null }, "X"), { ok: false, missing: ["phone", "address"] });
});

test("garde de source : aucune coordonnée de SAMA HOME dans la lecture ni dans le PDF du contrat", () => {
  for (const file of ["src/lib/contract-data.ts", "src/lib/contract-pdf.tsx", "src/lib/contract-settings.ts"]) {
    const source = readFileSync(file, "utf8");
    for (const leaked of ["338 66 60", "samahome.sn", "Grand Yoff", "CICES"]) {
      assert.ok(!source.includes(leaked), `${file} contient « ${leaked} » : coordonnées de SAMA HOME prêtées à un autre établissement`);
    }
    assert.ok(!/\?\? "SAMA HOME"|\|\| "SAMA HOME"/.test(source), `${file} : nom de repli « SAMA HOME »`);
  }
});

test("garde de source : un contrat incomplet renvoie vers les paramètres au lieu de produire un PDF", () => {
  const route = readFileSync("src/app/locations/[id]/contract/route.ts", "utf8");
  assert.match(route, /"missing" in data/);
  assert.match(route, /\/settings\/etablissement\?contrat=incomplet/);
  const data = readFileSync("src/lib/contract-data.ts", "utf8");
  assert.match(data, /resolveContractLessor\(settings, rental\.establishment\?\.name\)/);
  assert.match(data, /return \{ missing: lessor\.missing \}/);
});
