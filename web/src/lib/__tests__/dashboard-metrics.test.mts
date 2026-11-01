import test from "node:test";
import assert from "node:assert/strict";
import {
  countUnits,
  formatElapsed,
  formatFcfa,
  occupancyRate,
  pickRecentOccupied,
  summarizeReceivables,
  yearRange,
  type UnitStatus,
  type UnitType,
} from "../dashboard-metrics";

const unit = (type: UnitType, status: UnitStatus) => ({ type, status });

test("countUnits : séparation chambres / appartements et total cohérent", () => {
  const result = countUnits([
    unit("ROOM", "AVAILABLE"),
    unit("ROOM", "OCCUPIED"),
    unit("ROOM", "OCCUPIED"),
    unit("APARTMENT", "RESERVED"),
    unit("APARTMENT", "UNAVAILABLE"),
  ]);
  assert.deepEqual(result.rooms, { total: 3, available: 1, occupied: 2, reserved: 0, unavailable: 0 });
  assert.deepEqual(result.apartments, { total: 2, available: 0, occupied: 0, reserved: 1, unavailable: 1 });
  assert.deepEqual(result.all, { total: 5, available: 1, occupied: 2, reserved: 1, unavailable: 1 });
});

test("countUnits : aucun logement → tout à zéro, et deux appels ne partagent pas d'état", () => {
  const first = countUnits([unit("ROOM", "OCCUPIED")]);
  const second = countUnits([]);
  assert.equal(first.all.occupied, 1);
  assert.deepEqual(second.all, { total: 0, available: 0, occupied: 0, reserved: 0, unavailable: 0 });
});

test("occupancyRate : les logements indisponibles sortent du dénominateur", () => {
  assert.equal(occupancyRate({ total: 10, available: 4, occupied: 4, reserved: 0, unavailable: 2 }), 50);
  assert.equal(occupancyRate({ total: 4, available: 0, occupied: 0, reserved: 0, unavailable: 4 }), 0);
  assert.equal(occupancyRate({ total: 0, available: 0, occupied: 0, reserved: 0, unavailable: 0 }), 0);
  assert.equal(occupancyRate({ total: 3, available: 0, occupied: 3, reserved: 0, unavailable: 0 }), 100);
});

test("summarizeReceivables : ignore les soldes nuls, trie par montant, limite la liste", () => {
  const rows = [
    { id: "a", remaining: 0 },
    { id: "b", remaining: 5_000 },
    { id: "c", remaining: 20_000 },
    { id: "d", remaining: 1_000 },
  ];
  const result = summarizeReceivables(rows, 2);
  assert.equal(result.total, 26_000);
  assert.equal(result.count, 3);
  assert.deepEqual(result.top.map((row) => row.id), ["c", "b"]);
  assert.deepEqual(summarizeReceivables([]), { total: 0, count: 0, top: [] });
});

test("pickRecentOccupied : filtre par type, du plus récent au plus ancien, sans muter l'entrée", () => {
  const rentals = [
    { id: "1", type: "ROOM" as const, arrivalAt: new Date("2026-10-20T10:00:00Z") },
    { id: "2", type: "APARTMENT" as const, arrivalAt: new Date("2026-10-25T10:00:00Z") },
    { id: "3", type: "ROOM" as const, arrivalAt: new Date("2026-10-28T10:00:00Z") },
    { id: "4", type: "ROOM" as const, arrivalAt: new Date("2026-10-22T10:00:00Z") },
  ];
  const snapshot = rentals.map((r) => r.id);
  assert.deepEqual(pickRecentOccupied(rentals, "ROOM", 2).map((r) => r.id), ["3", "4"]);
  assert.deepEqual(pickRecentOccupied(rentals, "APARTMENT").map((r) => r.id), ["2"]);
  assert.deepEqual(rentals.map((r) => r.id), snapshot);
});

test("formatFcfa : séparateur de milliers, arrondi, espace normal", () => {
  assert.equal(formatFcfa(3_450_000), "3 450 000");
  assert.equal(formatFcfa(0), "0");
  assert.equal(formatFcfa(1234.6), "1 235");
});

test("formatElapsed : minutes, heures, jours, jamais négatif", () => {
  const from = new Date("2026-10-29T08:00:00Z");
  assert.equal(formatElapsed(from, new Date("2026-10-29T08:12:00Z")), "12 min");
  assert.equal(formatElapsed(from, new Date("2026-10-29T11:25:00Z")), "3 h 25 min");
  assert.equal(formatElapsed(from, new Date("2026-10-30T20:00:00Z")), "1 j 12 h");
  assert.equal(formatElapsed(from, new Date("2026-10-29T07:00:00Z")), "0 min");
});

test("yearRange : du 1er janvier inclus au 1er janvier suivant exclu", () => {
  const range = yearRange(new Date(2026, 9, 29, 15, 0));
  assert.equal(range.gte.getTime(), new Date(2026, 0, 1).getTime());
  assert.equal(range.lt.getTime(), new Date(2027, 0, 1).getTime());
});
