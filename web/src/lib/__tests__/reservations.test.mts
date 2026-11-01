// Tests du cycle de vie des réservations — logique pure + service de
// disponibilité réel (availability.ts) exécuté contre une fausse base en
// mémoire. AUCUNE connexion base : DATABASE_URL est forcée sur une cible
// inerte AVANT tout import applicatif, afin qu'aucun test ne puisse jamais
// atteindre une vraie base (production comprise).
import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/never_connected";
process.env.SESSION_SECRET ??= "test-only-secret";

const filters = await import("../reservation-filters");
const { checkRetroactiveArrival } = await import("../retroactive-checkin");
const { computeDepartureTime } = await import("../duration");
const { findAvailabilityConflict } = await import("../availability");

type Row = Record<string, unknown>;

/** Mini-interpréteur du sous-ensemble de filtres Prisma utilisé par les vues. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as Row[]).some((w) => matches(row, w));
    const value = row[key];
    if (cond instanceof Date || typeof cond !== "object" || cond === null) return value === cond;
    return Object.entries(cond as Row).every(([op, ref]) => {
      const v = value instanceof Date ? value.getTime() : value;
      const r = ref instanceof Date ? ref.getTime() : ref;
      if (op === "gte") return (v as number) >= (r as number);
      if (op === "gt") return (v as number) > (r as number);
      if (op === "lt") return (v as number) < (r as number);
      if (op === "not") return v !== r;
      if (op === "in") return (ref as unknown[]).includes(v);
      throw new Error(`opérateur non géré ${op}`);
    });
  });
}

const at = (hhmm: string, day = "2026-10-21") => new Date(`${day}T${hhmm}:00`);
const res = (status: string, arr: string, dep: string, day = "2026-10-21"): Row => ({
  status,
  arrivalTime: at(arr, day),
  departureTime: at(dep, day),
  date: at("00:00", day),
});
const visible = (r: Row, f: Parameters<typeof filters.buildReservationTimeWhere>[0], now: Date) =>
  matches(r, filters.buildReservationTimeWhere(f, now) as Row);

// ---------------------------------------------------------------- visibilité
test("À venir : réservation future visible", () => {
  assert.ok(visible(res("CONFIRMED", "20:30", "23:30"), "upcoming", at("10:00")));
});

test("À venir : CONFIRMÉE dont l'arrivée est dépassée mais départ non dépassé reste visible", () => {
  const r = res("CONFIRMED", "20:30", "23:30");
  assert.ok(visible(r, "upcoming", at("22:00")));
  assert.ok(visible(r, "pending", at("22:00")));
});

test("À venir : limites exactes (arrivée == now, départ == now)", () => {
  const r = res("CONFIRMED", "20:30", "23:30");
  assert.ok(visible(r, "upcoming", at("20:30")), "arrivée == now : à venir");
  assert.ok(visible(r, "upcoming", at("23:30")), "départ == now : encore visible");
  assert.ok(!visible(r, "upcoming", at("23:31")), "départ dépassé : plus 'à venir'");
  assert.ok(!visible(r, "pending", at("20:30")), "arrivée == now : pas encore en retard");
  assert.ok(visible(r, "pending", at("20:31")));
});

test("Départ dépassé : visible dans Passées et En attente d'arrivée (régularisation possible)", () => {
  const r = res("CONFIRMED", "20:30", "23:30");
  assert.ok(visible(r, "past", at("23:45")));
  assert.ok(visible(r, "pending", at("23:45")));
  assert.ok(!visible(r, "upcoming", at("23:45")));
});

test("Annulée : jamais à venir / en attente / passée ; seulement Annulées", () => {
  const r = res("CANCELLED", "20:30", "23:30");
  for (const f of ["upcoming", "pending", "past"] as const) assert.ok(!visible(r, f, at("22:00")), f);
  assert.ok(visible(r, "cancelled", at("22:00")));
});

test("ARRIVED passé n'est pas une arrivée à effectuer", () => {
  assert.ok(!visible(res("ARRIVED", "20:30", "23:30"), "pending", at("22:00")));
  assert.ok(!visible(res("ARRIVED", "20:30", "23:30"), "upcoming", at("22:00")));
  assert.ok(visible(res("ARRIVED", "20:30", "23:30"), "all", at("22:00")));
});

test("Aujourd'hui : filtre par jour calendaire, inchangé", () => {
  assert.ok(visible(res("CONFIRMED", "20:30", "23:30"), "today", at("22:00")));
  assert.ok(!visible(res("CONFIRMED", "20:30", "23:30", "2026-10-22"), "today", at("22:00")));
});

test("Une même vue ne compte une réservation qu'une fois (prédicat unique)", () => {
  const rows = [res("CONFIRMED", "20:30", "23:30"), res("CONFIRMED", "08:00", "10:00")];
  const now = at("21:00");
  assert.equal(rows.filter((r) => visible(r, "upcoming", now)).length, 1);
  assert.equal(rows.filter((r) => visible(r, "pending", now)).length, 2);
});

test("isArrivalOverdue", () => {
  assert.ok(filters.isArrivalOverdue("CONFIRMED", at("20:30"), at("20:31")));
  assert.ok(!filters.isArrivalOverdue("CONFIRMED", at("20:30"), at("20:30")));
  assert.ok(!filters.isArrivalOverdue("ARRIVED", at("20:30"), at("22:00")));
});

// ------------------------------------------------------------------- arrivée
test("Classification avance / heure / retard (20h30 prévue)", () => {
  const planned = at("20:30");
  assert.equal(filters.classifyArrivalTiming(planned, at("20:00")), "EARLY");
  assert.equal(filters.classifyArrivalTiming(planned, at("20:30")), "ON_TIME");
  assert.equal(filters.classifyArrivalTiming(planned, at("20:33")), "ON_TIME");
  assert.equal(filters.classifyArrivalTiming(planned, at("22:00")), "LATE");
});

test("Arrivée rétroactive : futur refusé, >24 h refusé, justification exigée", () => {
  const now = at("12:00");
  assert.equal(checkRetroactiveArrival(now, at("12:00")).ok, true);
  assert.equal(checkRetroactiveArrival(now, at("12:01")).ok, true, "tolérance 2 min");
  assert.equal(checkRetroactiveArrival(now, at("12:10")).ok, false, "futur");
  assert.equal(checkRetroactiveArrival(now, at("10:00")).ok, false, "sans justification");
  assert.equal(checkRetroactiveArrival(now, at("10:00"), "oubli").ok, true);
  assert.equal(checkRetroactiveArrival(now, at("10:00", "2026-10-20"), "oubli").ok, false, ">24 h");
});

test("Départ recalculé depuis l'arrivée réelle, durée figée conservée", () => {
  const dep = computeDepartureTime(at("20:00"), 1, "NIGHT");
  assert.equal(dep.getTime(), at("20:00", "2026-10-22").getTime());
});

// -------------------------------------------------------------- disponibilité
/** Fausse base : applique réellement les filtres de availability.ts. */
function fakeDb(reservations: Row[], rentals: Row[]) {
  const find =
    (rows: Row[]) =>
    async ({ where }: { where: Row }) => {
      const { id, ...rest } = where as { id?: { not: string } } & Row;
      return rows.find((r) => (!id || r.id !== id.not) && matches(r, rest)) ?? null;
    };
  return { reservation: { findFirst: find(reservations) }, rental: { findFirst: find(rentals) } } as unknown as Parameters<
    typeof findAvailabilityConflict
  >[0];
}
const rsv = (id: string, arr: string, dep: string, status = "CONFIRMED"): Row => ({
  id,
  propertyId: "p1",
  status,
  arrivalTime: at(arr),
  departureTime: at(dep),
  client: { name: "Autre" },
});
const rnt = (id: string, arr: string, dep: string): Row => ({
  id,
  propertyId: "p1",
  status: "ACTIVE",
  arrivalAt: at(arr),
  plannedDepartureAt: at(dep),
  client: { name: "Occupant" },
});
const check = (db: ReturnType<typeof fakeDb>, arr: string, dep: string, exclude?: string) =>
  findAvailabilityConflict(db, { propertyId: "p1", arrivalTime: at(arr), departureTime: at(dep), excludeReservationId: exclude });

test("Réservations contiguës : pas de conflit", async () => {
  assert.equal(await check(fakeDb([rsv("a", "10:00", "12:00")], []), "12:00", "14:00"), null);
});
test("Réservations qui se chevauchent : conflit", async () => {
  assert.equal((await check(fakeDb([rsv("a", "10:00", "12:00")], []), "11:59", "14:00"))?.kind, "reservation");
});
test("Location active en conflit", async () => {
  assert.equal((await check(fakeDb([], [rnt("r", "09:00", "13:00")]), "12:00", "15:00"))?.kind, "rental");
});
test("Réservation annulée ne bloque pas", async () => {
  assert.equal(await check(fakeDb([rsv("a", "10:00", "12:00", "CANCELLED")], []), "10:00", "12:00"), null);
});
test("Arrivée anticipée sans conflit (la réservation elle-même est exclue)", async () => {
  const db = fakeDb([rsv("me", "20:30", "23:30")], []);
  assert.equal(await check(db, "20:00", "23:00", "me"), null);
});
test("Arrivée anticipée avec conflit (occupant jusqu'à 20h15)", async () => {
  const db = fakeDb([rsv("me", "20:30", "23:30")], [rnt("r", "17:00", "20:15")]);
  assert.equal((await check(db, "20:00", "23:00", "me"))?.kind, "rental");
});
test("Arrivée tardive sans conflit", async () => {
  const db = fakeDb([rsv("me", "20:30", "22:30")], []);
  assert.equal(await check(db, "22:00", "23:59", "me"), null);
});
test("Arrivée tardive avec conflit (réservation suivante à 23:00)", async () => {
  const db = fakeDb([rsv("me", "20:30", "22:30"), rsv("next", "23:00", "23:50")], []);
  assert.equal((await check(db, "22:00", "23:59", "me"))?.id, "next");
});

// ---------------------------------------------------- erreurs de transaction
test("Conflit de sérialisation / doublon : messages compréhensibles, sans détail interne", () => {
  const ser = filters.describeTransactionFailure({ code: "P2034", message: "SELECT secret_table" }, "x");
  assert.match(ser, /Rien n'a été enregistré/);
  assert.doesNotMatch(ser, /secret_table/);
  assert.match(filters.describeTransactionFailure({ code: "P2002" }, "x"), /déjà donné lieu à une arrivée/);
  assert.equal(filters.describeTransactionFailure(new Error("boom"), "repli"), "repli");
});

test("isNextRedirectError : reconnaît la redirection d'une Server Action, pas une vraie erreur", () => {
  assert.equal(filters.isNextRedirectError({ digest: "NEXT_REDIRECT;push;/locations/abc?created=1;307;" }), true);
  assert.equal(filters.isNextRedirectError(new Error("network")), false);
  assert.equal(filters.isNextRedirectError({ digest: "OTHER" }), false);
  assert.equal(filters.isNextRedirectError(null), false);
});
