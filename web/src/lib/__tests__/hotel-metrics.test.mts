// Indicateurs hôteliers : occupation, recette par nuit occupée et par chambre disponible.
import test from "node:test";
import assert from "node:assert/strict";
import { computeHotelKpis, elapsedDaysInRange } from "../hotel-metrics";

const d = (iso: string) => new Date(iso);

test("jours écoulés : le jour en cours compte, jamais au-delà de la période", () => {
  assert.equal(elapsedDaysInRange(d("2026-11-01T00:00:00Z"), d("2026-12-01T00:00:00Z"), d("2026-11-10T08:00:00Z")), 10);
  assert.equal(elapsedDaysInRange(d("2026-10-01T00:00:00Z"), d("2026-11-01T00:00:00Z"), d("2026-11-10T08:00:00Z")), 31);
  assert.equal(elapsedDaysInRange(d("2026-12-01T00:00:00Z"), d("2027-01-01T00:00:00Z"), d("2026-11-10T08:00:00Z")), 0);
});

test("occupation, recette par nuit occupée et par chambre disponible", () => {
  const kpis = computeHotelKpis({
    from: d("2026-11-01T00:00:00Z"),
    to: d("2026-12-01T00:00:00Z"),
    now: d("2026-11-04T10:00:00Z"), // 4 jours écoulés
    propertyCount: 2,
    stays: [
      { propertyId: "A", start: d("2026-11-01T14:00:00Z"), end: d("2026-11-03T11:00:00Z") }, // jours 1, 2, 3
      { propertyId: "B", start: d("2026-11-04T09:00:00Z"), end: d("2026-11-06T11:00:00Z") }, // jour 4 (écoulé)
    ],
    revenue: 100_000,
  });
  assert.equal(kpis.availableNights, 8);
  assert.equal(kpis.occupiedNights, 4);
  assert.equal(kpis.occupancyPercent, 50);
  assert.equal(kpis.revenuePerOccupiedNight, 25_000);
  assert.equal(kpis.revenuePerAvailableNight, 12_500);
});

test("deux séjours qui se chevauchent sur une même chambre ne comptent qu'une nuit par jour", () => {
  const kpis = computeHotelKpis({
    from: d("2026-11-01T00:00:00Z"),
    to: d("2026-12-01T00:00:00Z"),
    now: d("2026-11-02T10:00:00Z"),
    propertyCount: 1,
    stays: [
      { propertyId: "A", start: d("2026-11-01T10:00:00Z"), end: d("2026-11-03T10:00:00Z") },
      { propertyId: "A", start: d("2026-11-01T12:00:00Z"), end: d("2026-11-03T12:00:00Z") },
    ],
    revenue: 0,
  });
  assert.equal(kpis.occupiedNights, 2);
  assert.equal(kpis.occupancyPercent, 100);
});

test("aucune chambre, aucune nuit ou aucun séjour : pas de division par zéro", () => {
  const empty = computeHotelKpis({ from: d("2026-11-01T00:00:00Z"), to: d("2026-12-01T00:00:00Z"), now: d("2026-11-04T00:00:00Z"), propertyCount: 0, stays: [], revenue: 5000 });
  assert.equal(empty.occupancyPercent, 0);
  assert.equal(empty.revenuePerAvailableNight, null);
  assert.equal(empty.revenuePerOccupiedNight, null);
  const future = computeHotelKpis({ from: d("2027-01-01T00:00:00Z"), to: d("2027-02-01T00:00:00Z"), now: d("2026-11-04T00:00:00Z"), propertyCount: 3, stays: [], revenue: 0 });
  assert.equal(future.availableNights, 0);
  assert.equal(future.revenuePerAvailableNight, null);
});
