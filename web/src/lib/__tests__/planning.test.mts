// Grille des chambres : recouvrement par jour, priorité séjour > réservation, intervalles invalides.
import test from "node:test";
import assert from "node:assert/strict";
import { buildPlanningGrid, coversDay, occupiedShare, planningDays, startOfUtcDay, type PlanningBooking } from "../planning";

const d = (iso: string) => new Date(iso);
const days = planningDays(d("2026-11-02T15:30:00Z"), 4); // 2, 3, 4, 5 novembre

test("les jours sont des jours UTC consécutifs, à partir de minuit", () => {
  assert.deepEqual(days.map((day) => day.toISOString()), [
    "2026-11-02T00:00:00.000Z",
    "2026-11-03T00:00:00.000Z",
    "2026-11-04T00:00:00.000Z",
    "2026-11-05T00:00:00.000Z",
  ]);
  assert.equal(startOfUtcDay(d("2026-11-02T23:59:59Z")).toISOString(), "2026-11-02T00:00:00.000Z");
});

test("recouvrement semi-ouvert : un départ à minuit pile n'occupe pas le jour suivant", () => {
  const stay = { start: d("2026-11-02T14:00:00Z"), end: d("2026-11-04T00:00:00Z") };
  assert.equal(coversDay(stay, days[0]), true);
  assert.equal(coversDay(stay, days[1]), true);
  assert.equal(coversDay(stay, days[2]), false);
});

test("séjour et réservation : le séjour l'emporte, la réservation seule est « réservée »", () => {
  const bookings: PlanningBooking[] = [
    { id: "s1", kind: "STAY", propertyId: "A", start: d("2026-11-02T10:00:00Z"), end: d("2026-11-03T12:00:00Z") },
    { id: "r1", kind: "RESERVATION", propertyId: "A", start: d("2026-11-03T14:00:00Z"), end: d("2026-11-05T11:00:00Z") },
  ];
  const grid = buildPlanningGrid(["A", "B"], bookings, days);
  assert.deepEqual(grid.get("A")!.map((c) => c.state), ["STAY", "STAY", "RESERVED", "RESERVED"]);
  assert.equal(grid.get("A")![1].bookingId, "s1");
  assert.deepEqual(grid.get("B")!.map((c) => c.state), ["FREE", "FREE", "FREE", "FREE"]);
});

test("un séjour ne déborde jamais sur une autre chambre", () => {
  const grid = buildPlanningGrid(["A", "B"], [{ id: "s1", kind: "STAY", propertyId: "A", start: d("2026-11-02T10:00:00Z"), end: d("2026-11-06T10:00:00Z") }], days);
  assert.ok(grid.get("B")!.every((c) => c.state === "FREE"));
});

test("intervalle vide ou inversé : ignoré, jamais une case occupée", () => {
  const bad: PlanningBooking[] = [
    { id: "x", kind: "STAY", propertyId: "A", start: d("2026-11-03T10:00:00Z"), end: d("2026-11-03T10:00:00Z") },
    { id: "y", kind: "RESERVATION", propertyId: "A", start: d("2026-11-04T10:00:00Z"), end: d("2026-11-03T10:00:00Z") },
  ];
  assert.ok(buildPlanningGrid(["A"], bad, days).get("A")!.every((c) => c.state === "FREE"));
});

test("taux d'occupation de la période affichée", () => {
  const grid = buildPlanningGrid(["A", "B"], [{ id: "s1", kind: "STAY", propertyId: "A", start: d("2026-11-02T10:00:00Z"), end: d("2026-11-04T10:00:00Z") }], days);
  assert.equal(occupiedShare(grid), 38); // 3 cases sur 8
  assert.equal(occupiedShare(new Map()), 0);
});
