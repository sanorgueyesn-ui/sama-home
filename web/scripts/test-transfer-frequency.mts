#!/usr/bin/env -S npx tsx
/**
 * Tests ciblés et reproductibles pour le correctif "Virements mensuels —
 * ancre durable" (Lot 12K).
 *
 * Usage :
 *   npx tsx scripts/test-transfer-frequency.mts
 *   npm run test:transfer-frequency
 *
 * Aucune dépendance de test ajoutée (ni vitest ni jest ne sont déjà
 * installés dans ce projet — vérifié dans package.json avant d'écrire ce
 * fichier) : assertions Node natives uniquement (`node:assert/strict`),
 * même esprit que `scripts/backup-db.mts`/`restore-db.mts` déjà présents.
 * Aucune base de données nécessaire : `advanceNextRunAt`,
 * `resolveAnchorDayOnCreate` et `resolveAnchorDayOnUpdate` sont des
 * fonctions pures (src/lib/transfer-frequency.ts), testables isolément.
 * Échoue bruyamment (code de sortie non nul) à la première assertion
 * fausse — jamais un succès silencieux en cas d'échec.
 */
import assert from "node:assert/strict";
import {
  advanceNextRunAt,
  resolveAnchorDayOnCreate,
  resolveAnchorDayOnUpdate,
} from "../src/lib/transfer-frequency";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

function d(iso: string): Date {
  return new Date(iso);
}
function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

console.log("=== Cas 1 — Ancre 31 : janvier → février → mars → avril → mai (2026) ===");
{
  let cur = d("2026-01-31T10:00:00.000Z");
  const anchor = 31;
  const expected = ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"];
  for (const exp of expected) {
    cur = advanceNextRunAt(cur, "MONTHLY", anchor);
    check(`-> ${exp}`, () => assert.equal(dateOnly(cur), exp));
  }
}

console.log("=== Cas 2 — Ancre 30 : janvier → février → mars → avril (2026) ===");
{
  let cur = d("2026-01-30T10:00:00.000Z");
  const anchor = 30;
  const expected = ["2026-02-28", "2026-03-30", "2026-04-30"];
  for (const exp of expected) {
    cur = advanceNextRunAt(cur, "MONTHLY", anchor);
    check(`-> ${exp}`, () => assert.equal(dateOnly(cur), exp));
  }
}

console.log("=== Cas 3 — Ancre 29, année NON bissextile (2026) ===");
{
  let cur = d("2026-01-29T10:00:00.000Z");
  const anchor = 29;
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("29 jan -> 28 fév (2026 non bissextile)", () => assert.equal(dateOnly(cur), "2026-02-28"));
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("28 fév -> 29 mars (retour à l'ancre)", () => assert.equal(dateOnly(cur), "2026-03-29"));
}

console.log("=== Cas 4 — Ancre 29, année bissextile (2028) ===");
{
  let cur = d("2028-01-29T10:00:00.000Z");
  const anchor = 29;
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("29 jan -> 29 fév (2028 bissextile, pas de clampage nécessaire)", () => assert.equal(dateOnly(cur), "2028-02-29"));
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("29 fév -> 29 mars", () => assert.equal(dateOnly(cur), "2028-03-29"));
}

console.log("=== Cas 5 — Exemple exact de l'énoncé : ancre 31 en 2028 (bissextile) ===");
{
  let cur = d("2028-01-31T10:00:00.000Z");
  const anchor = 31;
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("31 jan 2028 -> 29 fév 2028", () => assert.equal(dateOnly(cur), "2028-02-29"));
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("29 fév 2028 -> 31 mars 2028", () => assert.equal(dateOnly(cur), "2028-03-31"));
}

console.log("=== Cas 6 — Mois de 30 et 31 jours sans clampage (ancre 15) ===");
{
  let cur = d("2026-03-15T10:00:00.000Z");
  const anchor = 15;
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("15 mars (31j) -> 15 avril (30j)", () => assert.equal(dateOnly(cur), "2026-04-15"));
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("15 avril -> 15 mai (31j)", () => assert.equal(dateOnly(cur), "2026-05-15"));
}

console.log("=== Cas 7 — Plusieurs mois consécutifs avec retour à l'ancre (couvert par le Cas 1) ===");
check("déjà démontré par la séquence complète du Cas 1 (5 échéances consécutives)", () => {});

console.log("=== Cas 8 — Passage décembre -> janvier, ancre 31 ===");
{
  let cur = d("2026-11-30T10:00:00.000Z"); // ancre 31, déjà clampée en novembre (30 jours)
  const anchor = 31;
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("30 nov -> 31 déc (31j, l'ancre redevient atteignable)", () => assert.equal(dateOnly(cur), "2026-12-31"));
  cur = advanceNextRunAt(cur, "MONTHLY", anchor);
  check("31 déc -> 31 jan (année suivante)", () => assert.equal(dateOnly(cur), "2027-01-31"));
}

console.log("=== Cas 9 — Conservation de l'heure et des minutes ===");
{
  const cur = d("2026-01-31T14:37:52.123Z");
  const next = advanceNextRunAt(cur, "MONTHLY", 31);
  check("heure conservée", () => assert.equal(next.getUTCHours(), 14));
  check("minute conservée", () => assert.equal(next.getUTCMinutes(), 37));
  check("seconde conservée", () => assert.equal(next.getUTCSeconds(), 52));
  check("milliseconde conservée", () => assert.equal(next.getUTCMilliseconds(), 123));
}

console.log("=== Cas 10 — DAILY / WEEKLY / BIWEEKLY inchangés (anchorDay ignoré) ===");
{
  const base = d("2026-01-31T09:00:00.000Z");
  check("DAILY +1 jour", () => assert.equal(dateOnly(advanceNextRunAt(base, "DAILY")), "2026-02-01"));
  check("WEEKLY +7 jours", () => assert.equal(dateOnly(advanceNextRunAt(base, "WEEKLY")), "2026-02-07"));
  check("BIWEEKLY +14 jours", () => assert.equal(dateOnly(advanceNextRunAt(base, "BIWEEKLY")), "2026-02-14"));
  check("DAILY ignore un anchorDay fourni par erreur", () =>
    assert.equal(dateOnly(advanceNextRunAt(base, "DAILY", 15)), "2026-02-01"),
  );
}

console.log("=== Cas 11 — Création d'une programmation mensuelle : resolveAnchorDayOnCreate ===");
{
  check("ancre = jour de nextRunAt choisi (31)", () => assert.equal(resolveAnchorDayOnCreate(d("2026-01-31T08:00:00Z")), 31));
  check("ancre = jour de nextRunAt choisi (5)", () => assert.equal(resolveAnchorDayOnCreate(d("2026-03-05T08:00:00Z")), 5));
}

console.log("=== Cas 12 — Modification manuelle de nextRunAt : resolveAnchorDayOnUpdate ===");
{
  const existingNextRunAt = d("2026-02-28T08:00:00Z"); // schedule déjà clampée, ancre réelle = 31
  const existingAnchorDay = 31;
  const newNextRunAt = d("2026-06-15T08:00:00Z"); // l'admin choisit explicitement une nouvelle date
  check("nextRunAt changé -> nouvelle ancre = jour de la nouvelle date (15)", () =>
    assert.equal(resolveAnchorDayOnUpdate(existingNextRunAt, existingAnchorDay, newNextRunAt), 15),
  );
}

console.log("=== Cas 13 — Modification du seul montant : l'ancre ne bouge pas ===");
{
  const existingNextRunAt = d("2026-02-28T08:00:00Z");
  const existingAnchorDay = 31; // ancre réelle, distincte de nextRunAt déjà clampé
  // Le formulaire resoumet exactement le même nextRunAt (seul le montant a changé) :
  const resubmittedNextRunAt = d("2026-02-28T08:00:00Z");
  check("nextRunAt identique -> ancre existante conservée (31, pas 28)", () =>
    assert.equal(resolveAnchorDayOnUpdate(existingNextRunAt, existingAnchorDay, resubmittedNextRunAt), 31),
  );
}

console.log("=== Cas 14 — Programmation existante sans anchorDay (avant migration) ===");
{
  // advanceNextRunAt : anchorDay absent -> comportement de repli (ancien comportement, dérivé de `current`).
  let cur = d("2026-01-31T10:00:00.000Z");
  cur = advanceNextRunAt(cur, "MONTHLY", undefined);
  check("sans ancre : 31 jan -> 28 fév (comme avant ce lot)", () => assert.equal(dateOnly(cur), "2026-02-28"));
  cur = advanceNextRunAt(cur, "MONTHLY", undefined);
  check("sans ancre : 28 fév -> 28 mars (dérive connue, comportement de repli volontairement inchangé)", () =>
    assert.equal(dateOnly(cur), "2026-03-28"),
  );
  // resolveAnchorDayOnUpdate : existingAnchorDay = null (ligne jamais migrée/rattrapée) -> repli sur le jour de nextRunAt existant.
  const existingNextRunAt = d("2026-02-28T08:00:00Z");
  const resubmitted = d("2026-02-28T08:00:00Z");
  check("resolveAnchorDayOnUpdate, ancre absente, nextRunAt inchangé -> repli sur le jour existant (28)", () =>
    assert.equal(resolveAnchorDayOnUpdate(existingNextRunAt, null, resubmitted), 28),
  );
}

console.log(`\n${passed} assertions réussies. Aucun échec.`);
