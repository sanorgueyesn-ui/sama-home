import test from "node:test";
import assert from "node:assert/strict";
import { buildSetupSteps } from "../../app/settings/settings-setup";

const empty = { establishmentName: null, hasLogo: false, propertiesCount: 0, expenseCategoriesCount: 0, isAdmin: true };

test("espace vierge : aucune étape faite, quatre étapes pour un administrateur", () => {
  const result = buildSetupSteps(empty);
  assert.equal(result.total, 4);
  assert.equal(result.done, 0);
  assert.equal(result.complete, false);
  assert.deepEqual(result.steps.map((s) => s.id), ["identity", "logo", "properties", "categories"]);
});

test("un nom d'établissement vide ou fait d'espaces ne compte pas comme renseigné", () => {
  assert.equal(buildSetupSteps({ ...empty, establishmentName: "   " }).steps[0].done, false);
  assert.equal(buildSetupSteps({ ...empty, establishmentName: "" }).steps[0].done, false);
  assert.equal(buildSetupSteps({ ...empty, establishmentName: "Résidence Teranga" }).steps[0].done, true);
});

test("chaque étape dépend de sa propre donnée", () => {
  const result = buildSetupSteps({ establishmentName: "Teranga", hasLogo: false, propertiesCount: 3, expenseCategoriesCount: 0, isAdmin: true });
  assert.deepEqual(result.steps.map((s) => [s.id, s.done]), [
    ["identity", true],
    ["logo", false],
    ["properties", true],
    ["categories", false],
  ]);
  assert.equal(result.done, 2);
});

test("un compte qui n'est pas administrateur n'a pas l'étape des catégories", () => {
  const result = buildSetupSteps({ ...empty, isAdmin: false });
  assert.equal(result.total, 3);
  assert.ok(!result.steps.some((s) => s.id === "categories"));
});

test("tout fait : complete, et la progression est cohérente", () => {
  const result = buildSetupSteps({ establishmentName: "Teranga", hasLogo: true, propertiesCount: 1, expenseCategoriesCount: 2, isAdmin: true });
  assert.equal(result.complete, true);
  assert.equal(result.done, result.total);
});

test("chaque étape pointe vers une page existante des paramètres ou des logements", () => {
  for (const step of buildSetupSteps(empty).steps) {
    assert.match(step.href, /^\/(settings|logements)(\/|$)/);
    assert.ok(step.label.length > 0 && step.hint.length > 0 && step.cta.length > 0);
  }
});
