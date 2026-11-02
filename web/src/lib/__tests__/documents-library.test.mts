// Bibliothèque de documents PDF : montants en lettres, règles de contrat, validation des paramètres
// d'aperçu, registres de présentations (aucune base). Le rendu PDF (react-pdf) ne se charge pas sous tsx :
// il est vérifié par la route d'aperçu.
import test from "node:test";
import assert from "node:assert/strict";
import { amountInWords, amountInWordsCfa, amountInWordsCfaInline } from "../documents/format";
import { checkLeaseDeposit } from "../documents/contract-clauses";
import { parsePreviewParams } from "../documents/preview-params";
import { CONTRACT_THEMES } from "../documents/contract-themes";
import { TICKET_THEMES } from "../documents/ticket-themes";

test("montants en lettres : règles françaises", () => {
  assert.equal(amountInWords(0), "zéro");
  assert.equal(amountInWords(21), "vingt et un");
  assert.equal(amountInWords(71), "soixante et onze");
  assert.equal(amountInWords(80), "quatre-vingts");
  assert.equal(amountInWords(81), "quatre-vingt-un");
  assert.equal(amountInWords(200), "deux cents");
  assert.equal(amountInWords(201), "deux cent un");
  assert.equal(amountInWords(1000), "mille");
  assert.equal(amountInWords(80_000), "quatre-vingt mille");
  assert.equal(amountInWords(272_000), "deux cent soixante-douze mille");
  assert.equal(amountInWords(1_200), "mille deux cents");
  assert.equal(amountInWords(2_000_000), "deux millions");
  assert.equal(amountInWordsCfa(1), "Un franc CFA");
  assert.equal(amountInWordsCfaInline(150_000), "cent cinquante mille francs CFA");
});

test("montants en lettres : refuse ce qu'on ne sait pas écrire juste", () => {
  assert.throws(() => amountInWords(-1), RangeError);
  assert.throws(() => amountInWords(1.5), RangeError);
  assert.throws(() => amountInWords(Number.NaN), RangeError);
  assert.throws(() => amountInWords(1_000_000_000_000), RangeError);
});

test("caution : plafond de 2 mois pour un loyer jusqu'à 500 000 FCFA", () => {
  assert.equal(checkLeaseDeposit(200_000, 400_000).ok, true);
  assert.equal(checkLeaseDeposit(200_000, 400_001).ok, false);
  assert.equal(checkLeaseDeposit(500_000, 1_000_000).ok, true);
  assert.equal(checkLeaseDeposit(600_000, 3_000_000).ok, true);
});

test("registres : 10 présentations uniques par famille", () => {
  for (const themes of [CONTRACT_THEMES, TICKET_THEMES]) {
    assert.equal(themes.length, 10);
    assert.deepEqual(themes.map((t) => t.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(new Set(themes.map((t) => t.name)).size, 10);
  }
});

test("aperçu : liste blanche des paramètres", () => {
  const parse = (query: string) => parsePreviewParams(new URLSearchParams(query));
  assert.equal(parse("family=ticket&theme=3&kind=PAYMENT&width=58").ok, true);
  assert.equal(parse("family=contract&theme=10&kind=LEASE_OPEN").ok, true);
  assert.equal(parse("family=quittance&theme=1&partial=1").ok, true);
  assert.equal(parse("family=ticket&theme=11").ok, false);
  assert.equal(parse("family=ticket&theme=0").ok, false);
  assert.equal(parse("family=ticket&theme=1e1").ok, false);
  assert.equal(parse("family=ticket&theme=1&kind=../../etc").ok, false);
  assert.equal(parse("family=ticket&theme=1&width=999").ok, false);
  assert.equal(parse("family=contract&theme=1&kind=NOPE").ok, false);
  assert.equal(parse("family=autre&theme=1").ok, false);
  assert.equal(parse("").ok, false);
});
