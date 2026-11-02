// Ménage : règles pures. La propreté est distincte de l'occupation.
import test from "node:test";
import assert from "node:assert/strict";
import { canChangeCleaning, cleaningActions, compareForHousekeeping, isCleaningStatus, readiness } from "../housekeeping";

test("statuts : seules les trois valeurs connues sont acceptées", () => {
  assert.equal(isCleaningStatus("DIRTY"), true);
  assert.equal(isCleaningStatus("CLEAN"), true);
  assert.equal(isCleaningStatus("INSPECTED"), false);
  assert.equal(isCleaningStatus(undefined), false);
  assert.equal(isCleaningStatus("clean"), false);
});

test("actions : jamais l'état courant, toujours une sortie possible", () => {
  for (const from of ["DIRTY", "IN_PROGRESS", "CLEAN"] as const) {
    const actions = cleaningActions(from);
    assert.ok(actions.length >= 1);
    assert.ok(actions.every((a) => a.to !== from && canChangeCleaning(from, a.to)));
  }
  assert.equal(canChangeCleaning("CLEAN", "CLEAN"), false);
});

test("prête à louer = libre ET propre ; occupée n'est jamais prête", () => {
  assert.equal(readiness("CLEAN", "AVAILABLE"), "READY");
  assert.equal(readiness("CLEAN", "RESERVED"), "READY");
  assert.equal(readiness("DIRTY", "AVAILABLE"), "NOT_READY");
  assert.equal(readiness("IN_PROGRESS", "AVAILABLE"), "NOT_READY");
  assert.equal(readiness("CLEAN", "OCCUPIED"), "OCCUPIED");
  assert.equal(readiness("DIRTY", "OCCUPIED"), "OCCUPIED");
  assert.equal(readiness("CLEAN", "UNAVAILABLE"), "UNAVAILABLE");
});

test("ordre de travail : à nettoyer et libre d'abord, occupées en dernier", () => {
  const rows = [
    { name: "Chambre 2", cleaning: "CLEAN" as const, occupancy: "AVAILABLE" as const },
    { name: "Chambre 10", cleaning: "DIRTY" as const, occupancy: "OCCUPIED" as const },
    { name: "Chambre 3", cleaning: "DIRTY" as const, occupancy: "AVAILABLE" as const },
    { name: "Chambre 1", cleaning: "IN_PROGRESS" as const, occupancy: "AVAILABLE" as const },
  ].sort(compareForHousekeeping);
  assert.deepEqual(rows.map((r) => r.name), ["Chambre 3", "Chambre 1", "Chambre 2", "Chambre 10"]);
});
