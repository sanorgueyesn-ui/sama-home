// Vocabulaire des pages : l'hôtel et la résidence ne parlent pas pareil ; l'agence (suspendue) retombe
// sur la résidence. Pur, aucune base.
import test from "node:test";
import assert from "node:assert/strict";
import { pageVocabulary } from "../page-vocabulary";

test("hôtel : séjours, check-in direct, clients", () => {
  const vocab = pageVocabulary("HOTEL");
  assert.equal(vocab.stays, "Séjours en cours");
  assert.equal(vocab.newStay, "Check-in direct");
  assert.equal(vocab.guestsTitle, "Clients");
});

test("résidence : locations, nouvelle location, locataires", () => {
  const vocab = pageVocabulary("RESIDENCE");
  assert.equal(vocab.stays, "Locations");
  assert.equal(vocab.newStay, "Nouvelle location");
  assert.equal(vocab.guestsTitle, "Locataires");
});

test("agence suspendue : vocabulaire résidence, jamais d'erreur", () => {
  assert.deepEqual(pageVocabulary("AGENCY"), pageVocabulary("RESIDENCE"));
});

test("chaque mode renseigne tous les libellés", () => {
  for (const mode of ["HOTEL", "RESIDENCE"] as const) {
    for (const [key, value] of Object.entries(pageVocabulary(mode))) {
      assert.ok(typeof value === "string" && value.trim().length > 0, `${mode}.${key} vide`);
    }
  }
});
