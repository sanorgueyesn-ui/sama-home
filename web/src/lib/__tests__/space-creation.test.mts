import test from "node:test";
import assert from "node:assert/strict";
import { canCreateSpace, parseSpaceCreation, MAX_SPACES_PER_ACCOUNT } from "../space-creation";

test("nom et mode valides : le nom est nettoyé", () => {
  const result = parseSpaceCreation({ name: "  Hôtel   du  Port ", businessMode: "HOTEL" });
  assert.deepEqual(result, { ok: true, name: "Hôtel du Port", businessMode: "HOTEL" });
});

test("nom absent, trop court, trop long ou non textuel : refusé", () => {
  for (const name of [undefined, null, 42, "", " ", "a", "x".repeat(81)]) {
    const result = parseSpaceCreation({ name, businessMode: "HOTEL" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "name");
  }
});

test("mode hors liste blanche : refusé (y compris l'alias d'interface AGENCY)", () => {
  for (const businessMode of [undefined, "", "AGENCY", "hotel", "ADMIN", 1]) {
    const result = parseSpaceCreation({ name: "Mon espace", businessMode });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.field, "businessMode");
  }
});

test("agence immobilière : refusée tant qu'elle est suspendue, acceptée quand le mode est rouvert", () => {
  const suspended = parseSpaceCreation({ name: "Mon agence", businessMode: "REAL_ESTATE" });
  assert.equal(suspended.ok, false);
  if (!suspended.ok) {
    assert.equal(suspended.field, "businessMode");
    assert.match(suspended.message, /pas disponibles pour le moment/);
  }
  // Même règle, interrupteur rouvert : rien d'autre à changer pour rétablir le mode.
  assert.deepEqual(parseSpaceCreation({ name: "Mon agence", businessMode: "REAL_ESTATE" }, true), {
    ok: true,
    name: "Mon agence",
    businessMode: "REAL_ESTATE",
  });
  // Hôtel et résidence restent possibles dans les deux cas.
  for (const agencyEnabled of [false, true]) {
    for (const businessMode of ["HOTEL", "RESIDENCE"] as const) {
      assert.equal(parseSpaceCreation({ name: "Mon espace", businessMode }, agencyEnabled).ok, true);
    }
  }
});

test("administrateur sous le plafond : autorisé", () => {
  assert.deepEqual(canCreateSpace({ isPlatformAdmin: false, role: "ADMIN", currentSpaceCount: 1 }), { allowed: true });
});

test("gestionnaire, rôle absent ou compte de plateforme : refusé", () => {
  for (const args of [
    { isPlatformAdmin: false, role: "GESTIONNAIRE", currentSpaceCount: 1 },
    { isPlatformAdmin: false, role: null, currentSpaceCount: 1 },
    { isPlatformAdmin: true, role: "ADMIN", currentSpaceCount: 0 },
  ]) {
    assert.equal(canCreateSpace(args).allowed, false);
  }
});

test("plafond atteint : refusé, un de moins : autorisé", () => {
  assert.equal(canCreateSpace({ isPlatformAdmin: false, role: "ADMIN", currentSpaceCount: MAX_SPACES_PER_ACCOUNT }).allowed, false);
  assert.equal(canCreateSpace({ isPlatformAdmin: false, role: "ADMIN", currentSpaceCount: MAX_SPACES_PER_ACCOUNT - 1 }).allowed, true);
});
