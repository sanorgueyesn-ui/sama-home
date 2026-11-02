// Moteur de traduction par phrase : exact, à valeurs, repli sur le français.
import test from "node:test";
import assert from "node:assert/strict";
import { createT, phraseKey, translate } from "../i18n/translate";

const book = {
  Enregistrer: "Save",
  client: "guest",
  "{n} règlement(s)": "{n} payment(s)",
  "{n} règlement(s) · {m} FCFA ce mois-ci": "{n} payment(s) · {m} FCFA this month",
  "Aucun {who} ne correspond à « {q} ».": "No {who} matches “{q}”.",
  "{a} moins dépenses · {b}": "{a} minus expenses · {b}",
  "{v} % par rapport à la période précédente": "{v}% compared with the previous period",
  Recettes: "Revenue",
};

test("phrase exacte : traduite ; absente : le français reste, jamais une clé ou un blanc", () => {
  assert.equal(translate(book, "Enregistrer"), "Save");
  assert.equal(translate(book, "Texte jamais traduit"), "Texte jamais traduit");
  assert.equal(translate({}, "Enregistrer"), "Enregistrer");
});

test("espaces de début et de fin conservés, espaces internes normalisés", () => {
  assert.equal(translate(book, "  Enregistrer "), "  Save ");
  assert.equal(translate(book, "Aucun\n  client ne correspond à « x »."), "No guest matches “x”.");
  assert.equal(phraseKey("  a \n b  "), "a b");
});

test("phrase à valeurs : le texte déjà assemblé est reconnu par sa forme", () => {
  assert.equal(translate(book, "5 règlement(s)"), "5 payment(s)");
  assert.equal(translate(book, "2 règlement(s) · 50 000 FCFA ce mois-ci"), "2 payment(s) · 50 000 FCFA this month");
});

test("une valeur qui est elle-même une phrase est traduite à son tour", () => {
  assert.equal(translate(book, "Aucun client ne correspond à « Awa »."), "No guest matches “Awa”.");
  assert.equal(translate(book, "Recettes moins dépenses · +12 % par rapport à la période précédente"), "Revenue minus expenses · +12% compared with the previous period");
});

test("une donnée saisie (nom, montant) n'est jamais déformée", () => {
  assert.equal(translate(book, "Awa Diop"), "Awa Diop");
  assert.equal(translate(book, "135 000 FCFA"), "135 000 FCFA");
  assert.equal(translate(book, "Aucun client ne correspond à « Awa Diop »."), "No guest matches “Awa Diop”.");
});

test("variables explicites : remplacées, une absente reste visible", () => {
  const t = createT({ "Bonjour {name}": "Hello {name}" });
  assert.equal(t("Bonjour {name}", { name: "Awa" }), "Hello Awa");
  assert.equal(t("Bonjour {name}", {}), "Hello {name}");
});
