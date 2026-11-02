// Choix de présentation : la valeur reçue du navigateur est toujours revalidée.
import test from "node:test";
import assert from "node:assert/strict";
import { parseDocumentSelection } from "../documents/selection";

test("contrat : présentation de 1 à 10 acceptée", () => {
  assert.deepEqual(parseDocumentSelection({ kind: "contract", theme: "3" }), { ok: true, value: { kind: "contract", theme: 3 } });
  assert.equal(parseDocumentSelection({ kind: "contract", theme: 10 }).ok, true);
});

test("présentation hors registre, forgée ou non numérique : refusée", () => {
  for (const theme of ["0", "11", "-1", "1e1", "abc", "", "3 ", undefined, null, 3.5]) {
    assert.equal(parseDocumentSelection({ kind: "contract", theme }).ok, false, String(theme));
  }
});

test("ticket : exige une largeur de papier connue", () => {
  assert.deepEqual(parseDocumentSelection({ kind: "ticket", theme: "2", paper: "58" }), { ok: true, value: { kind: "ticket", theme: 2, paper: "58" } });
  assert.equal(parseDocumentSelection({ kind: "ticket", theme: "2", paper: "a4" }).ok, true);
  assert.equal(parseDocumentSelection({ kind: "ticket", theme: "2", paper: "100" }).ok, false);
  assert.equal(parseDocumentSelection({ kind: "ticket", theme: "2" }).ok, false);
});

test("type de document inconnu : refusé", () => {
  assert.equal(parseDocumentSelection({ kind: "facture", theme: "1" }).ok, false);
  assert.equal(parseDocumentSelection({ kind: undefined, theme: "1" }).ok, false);
});
