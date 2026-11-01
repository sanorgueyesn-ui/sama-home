import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrend,
  parseReportPeriod,
  percentOf,
  previousReportRange,
  reportRange,
  toShares,
  trendMax,
  variationPercent,
} from "../reports-metrics";

// Mercredi 15 octobre 2026, 14 h (heure locale du processus, comme period.ts).
const NOW = new Date(2026, 9, 15, 14, 0, 0);

test("parseReportPeriod : valeur inconnue, absente ou forgée → « ce mois »", () => {
  assert.equal(parseReportPeriod("month"), "month");
  assert.equal(parseReportPeriod("last-month"), "last-month");
  assert.equal(parseReportPeriod("year"), "year");
  for (const bad of [undefined, null, "", "all", "MONTH", "year; DROP TABLE", ["year"], 3]) {
    assert.equal(parseReportPeriod(bad), "month");
  }
});

test("reportRange : bornes [début, fin) du mois, du mois dernier et de l'année", () => {
  const month = reportRange("month", NOW);
  assert.deepEqual([month.gte, month.lt], [new Date(2026, 9, 1), new Date(2026, 10, 1)]);
  assert.equal(month.granularity, "day");

  const last = reportRange("last-month", NOW);
  assert.deepEqual([last.gte, last.lt], [new Date(2026, 8, 1), new Date(2026, 9, 1)]);
  assert.equal(last.granularity, "day");

  const year = reportRange("year", NOW);
  assert.deepEqual([year.gte, year.lt], [new Date(2026, 0, 1), new Date(2027, 0, 1)]);
  assert.equal(year.granularity, "month");
});

test("reportRange : en janvier, le mois dernier est décembre de l'année précédente", () => {
  const january = new Date(2027, 0, 10);
  const last = reportRange("last-month", january);
  assert.deepEqual([last.gte, last.lt], [new Date(2026, 11, 1), new Date(2027, 0, 1)]);
  const before = previousReportRange("month", january);
  assert.deepEqual([before.gte, before.lt], [new Date(2026, 11, 1), new Date(2027, 0, 1)]);
});

test("previousReportRange : touche exactement la période d'avant, sans chevauchement", () => {
  for (const period of ["month", "last-month", "year"] as const) {
    const current = reportRange(period, NOW);
    const previous = previousReportRange(period, NOW);
    assert.equal(previous.lt.getTime(), current.gte.getTime(), period);
    assert.ok(previous.gte < previous.lt, period);
  }
  const year = previousReportRange("year", NOW);
  assert.deepEqual([year.gte, year.lt], [new Date(2025, 0, 1), new Date(2026, 0, 1)]);
});

test("percentOf : arrondi entier, 0 quand le total est nul ou négatif", () => {
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(2, 3), 67);
  assert.equal(percentOf(5, 0), 0);
  assert.equal(percentOf(5, -10), 0);
});

test("variationPercent : évolution réelle, null sans période précédente exploitable", () => {
  assert.equal(variationPercent(150, 100), 50);
  assert.equal(variationPercent(50, 100), -50);
  assert.equal(variationPercent(100, 100), 0);
  assert.equal(variationPercent(100, 0), null);
  assert.equal(variationPercent(100, -20), null);
  assert.equal(variationPercent(0, 100), -100);
});

test("buildTrend : un point par jour jusqu'à aujourd'hui, sommes par jour, résultat net", () => {
  const range = reportRange("month", NOW);
  const trend = buildTrend(
    range,
    [
      { paidAt: new Date(2026, 9, 1, 9), amount: 10_000 },
      { paidAt: new Date(2026, 9, 1, 18), amount: 5_000 },
      { paidAt: new Date(2026, 9, 15, 8), amount: 20_000 },
    ],
    [{ paidAt: new Date(2026, 9, 1, 12), amount: 4_000 }],
    NOW,
  );
  assert.equal(trend.length, 15, "du 1er au 15 octobre, pas de jours futurs");
  assert.deepEqual(trend[0], { start: new Date(2026, 9, 1), revenue: 15_000, expense: 4_000, net: 11_000 });
  assert.equal(trend[1].revenue, 0);
  assert.equal(trend[14].revenue, 20_000);
  assert.equal(trend[14].net, 20_000);
});

test("buildTrend : une ligne hors période est ignorée, la dernière seconde du mois compte", () => {
  const range = reportRange("last-month", NOW);
  const trend = buildTrend(
    range,
    [
      { paidAt: new Date(2026, 7, 31, 23, 59, 59), amount: 999 },
      { paidAt: new Date(2026, 8, 30, 23, 59, 59), amount: 100 },
      { paidAt: new Date(2026, 9, 1, 0, 0, 0), amount: 777 },
    ],
    [],
    NOW,
  );
  assert.equal(trend.length, 30, "septembre a 30 jours");
  assert.equal(trend.reduce((sum, p) => sum + p.revenue, 0), 100);
  assert.equal(trend[29].revenue, 100);
});

test("buildTrend : l'année se découpe par mois, février bissextile ne casse rien", () => {
  const range = reportRange("year", NOW);
  const trend = buildTrend(
    range,
    [
      { paidAt: new Date(2026, 0, 31, 23), amount: 1 },
      { paidAt: new Date(2026, 1, 1), amount: 2 },
      { paidAt: new Date(2026, 9, 3), amount: 4 },
    ],
    [{ paidAt: new Date(2026, 9, 9), amount: 3 }],
    NOW,
  );
  assert.equal(trend.length, 10, "janvier à octobre");
  assert.deepEqual(trend.map((p) => p.revenue), [1, 2, 0, 0, 0, 0, 0, 0, 0, 4]);
  assert.equal(trend[9].net, 1);

  const leap = buildTrend(reportRange("month", new Date(2028, 1, 29)), [], [], new Date(2028, 1, 29));
  assert.equal(leap.length, 29);
});

test("buildTrend : période sans mouvement → des points à zéro, jamais d'erreur", () => {
  const trend = buildTrend(reportRange("month", NOW), [], [], NOW);
  assert.equal(trend.length, 15);
  assert.ok(trend.every((p) => p.revenue === 0 && p.expense === 0 && p.net === 0));
  assert.equal(trendMax(trend), 1);
});

test("trendMax : plus grande barre, recettes ou dépenses", () => {
  const trend = buildTrend(
    reportRange("month", NOW),
    [{ paidAt: new Date(2026, 9, 2), amount: 300 }],
    [{ paidAt: new Date(2026, 9, 3), amount: 800 }],
    NOW,
  );
  assert.equal(trendMax(trend), 800);
});

test("toShares : tri décroissant, parts en %, lignes à zéro écartées", () => {
  const shares = toShares([
    { key: "WAVE", label: "Wave", amount: 25_000 },
    { key: "CASH", label: "Espèces", amount: 75_000 },
    { key: "OTHER", label: "Autre", amount: 0 },
  ]);
  assert.deepEqual(
    shares.map((s) => [s.key, s.amount, s.percent]),
    [
      ["CASH", 75_000, 75],
      ["WAVE", 25_000, 25],
    ],
  );
  assert.deepEqual(toShares([]), []);
});

test("toShares : à montants égaux, l'ordre est stable (libellé)", () => {
  const shares = toShares([
    { key: "b", label: "Zéro déchet", amount: 10 },
    { key: "a", label: "Achats", amount: 10 },
  ]);
  assert.deepEqual(shares.map((s) => s.key), ["a", "b"]);
});
