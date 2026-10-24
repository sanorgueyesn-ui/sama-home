// Lot 3B (B2.13-0) — permission plateforme EXPLICITE pour le flux de double approbation.
//
// Isolation : module pur, AUCUNE base, AUCUN réseau, AUCUNE doublure nécessaire.
import test from "node:test";
import assert from "node:assert/strict";

const { hasExplicitPlatformPermission, hasPlatformPermission } = await import("../permissions");

type U = { isPlatformAdmin: boolean; permissions?: string | null };
const platform = (permissions: string | null | undefined): U => ({ isPlatformAdmin: true, permissions });
const can = (u: U | null | undefined) => hasExplicitPlatformPermission(u, "PLATFORM_SUBSCRIPTIONS");

test("permissions = null : pleins pouvoirs canoniques d'un administrateur de plateforme, accepté", () => {
  assert.equal(can(platform(null)), true);
});

test("permissions explicites autorisées : PLATFORM_SUBSCRIPTIONS, PLATFORM_ALL, ALL (JSON)", () => {
  assert.equal(can(platform(JSON.stringify(["PLATFORM_SUBSCRIPTIONS"]))), true);
  assert.equal(can(platform(JSON.stringify(["PLATFORM_ALL"]))), true);
  assert.equal(can(platform(JSON.stringify(["ALL"]))), true);
  assert.equal(can(platform(JSON.stringify(["PLATFORM_DASHBOARD", "PLATFORM_SUBSCRIPTIONS", "PLATFORM_USERS"]))), true);
  assert.equal(can(platform('["PLATFORM_SUBSCRIPTIONS"]')), true);
});

test("format tolérant par parseUserPermissions : liste séparée par des virgules", () => {
  assert.equal(can(platform("PLATFORM_SUBSCRIPTIONS")), true);
  assert.equal(can(platform("PLATFORM_DASHBOARD,PLATFORM_SUBSCRIPTIONS")), true);
  assert.equal(can(platform(" PLATFORM_DASHBOARD , PLATFORM_SUBSCRIPTIONS ")), true);
  assert.equal(can(platform("PLATFORM_ALL")), true);
  assert.equal(can(platform("ALL")), true);
  assert.equal(can(platform(JSON.stringify([" PLATFORM_SUBSCRIPTIONS "]))), true, "espaces autour d'un élément retirés par le parseur");
});

test("liste explicite SANS la permission adéquate : refusée", () => {
  for (const p of [
    ["PLATFORM_DASHBOARD"],
    ["PLATFORM_ESTABLISHMENTS", "PLATFORM_USERS", "PLATFORM_SETTINGS", "PLATFORM_AUDIT"],
    ["PLATFORM_SUBSCRIPTION"], // faute de frappe
    ["PLATFORM_SUBSCRIPTIONS_X"],
    ["platform_subscriptions"], // casse différente
    ["Platform_Subscriptions"],
    ["all"],
    ["platform_all"],
  ]) {
    assert.equal(can(platform(JSON.stringify(p))), false, JSON.stringify(p));
  }
  assert.equal(can(platform("PLATFORM_DASHBOARD,PLATFORM_USERS")), false);
});

test("liste vide, chaîne vide, espaces : JAMAIS les pleins pouvoirs (contrairement à hasPlatformPermission)", () => {
  for (const v of ["", " ", "   ", "\t", "\n", " \t\n ", "[]", " [] ", "[ ]", ",", ",,", " , , ", "[\"\"]", "[\" \"]", "[\"\", \"\"]"]) {
    assert.equal(can(platform(v)), false, JSON.stringify(v));
  }
});

test("la fonction existante hasPlatformPermission est inchangée : elle accorde toujours les pleins pouvoirs aux listes vides", () => {
  // Preuve que seule la nouvelle fonction est stricte et que l'ancienne n'a pas été modifiée.
  for (const v of [null, "", "[]", ",", "   "]) {
    assert.equal(hasPlatformPermission(platform(v), "PLATFORM_SUBSCRIPTIONS"), true, JSON.stringify(v));
  }
  assert.equal(hasPlatformPermission(platform('["PLATFORM_DASHBOARD"]'), "PLATFORM_SUBSCRIPTIONS"), false);
  assert.equal(hasPlatformPermission(platform('["PLATFORM_SUBSCRIPTIONS"]'), "PLATFORM_SUBSCRIPTIONS"), true);
});

test("listes mal formées : refusées", () => {
  for (const v of [
    '["PLATFORM_SUBSCRIPTIONS"', // crochet fermant manquant
    '"PLATFORM_SUBSCRIPTIONS"]',
    "[PLATFORM_SUBSCRIPTIONS]", // JSON invalide (pas de guillemets)
    "['PLATFORM_SUBSCRIPTIONS']", // guillemets simples
    '{"permissions":["PLATFORM_SUBSCRIPTIONS"]}', // objet JSON, pas une liste
    '{"PLATFORM_SUBSCRIPTIONS":true}',
    "[null]",
    "[1, 2, 3]",
    '["PLATFORM_SUBSCRIPTIONS", null]', // un seul élément non textuel invalide toute la liste
    '["PLATFORM_SUBSCRIPTIONS", 1]',
    '["PLATFORM_SUBSCRIPTIONS", ["PLATFORM_USERS"]]',
    '["PLATFORM_SUBSCRIPTIONS"]]', // crochet fermant en trop
    '[["PLATFORM_SUBSCRIPTIONS"',
    "PLATFORM_SUBSCRIPTIONS]", // crochet isolé
    "[PLATFORM_SUBSCRIPTIONS",
    "[[\"PLATFORM_SUBSCRIPTIONS\"]]", // liste imbriquée (aplatie par l'ancien parseur : refusée ici)
    "[{\"id\":\"PLATFORM_SUBSCRIPTIONS\"}]",
    "null", // la chaîne "null", pas la valeur null
    "undefined",
    "true",
    "0",
  ]) {
    assert.equal(can(platform(v)), false, JSON.stringify(v));
  }
});

test("permission absente du champ (undefined) : refusée, jamais un accès par omission", () => {
  assert.equal(can({ isPlatformAdmin: true }), false);
  assert.equal(can(platform(undefined)), false);
});

test("valeurs de type inattendu pour permissions : refusées", () => {
  for (const v of [0, 1, NaN, true, false, {}, [], ["PLATFORM_SUBSCRIPTIONS"], () => "PLATFORM_SUBSCRIPTIONS"]) {
    assert.equal(can(platform(v as unknown as string)), false, typeof v);
  }
});

test("utilisateur qui n'est pas administrateur de plateforme : refusé, quelles que soient ses permissions", () => {
  const notPlatform = (permissions: string | null | undefined): U => ({ isPlatformAdmin: false, permissions });
  for (const v of [null, undefined, "", "[]", "ALL", "PLATFORM_ALL", '["PLATFORM_SUBSCRIPTIONS"]', "PLATFORM_SUBSCRIPTIONS"]) {
    assert.equal(can(notPlatform(v)), false, JSON.stringify(v));
  }
  assert.equal(can(null), false);
  assert.equal(can(undefined), false);
});

test("isPlatformAdmin doit valoir exactement true : pas de valeur « truthy »", () => {
  for (const v of [1, "true", "yes", {}, [], "1"]) {
    const u = { isPlatformAdmin: v as unknown as boolean, permissions: null };
    assert.equal(can(u), false, JSON.stringify(v));
  }
  const missing = { permissions: null } as unknown as U;
  assert.equal(can(missing), false);
});

test("aucun rôle supposé : un rôle d'établissement ne donne aucun accès", () => {
  const withRole = { isPlatformAdmin: false, role: "ADMIN", permissions: null } as unknown as U;
  assert.equal(can(withRole), false);
  const adminRoleNoPlatform = { isPlatformAdmin: false, role: "ADMIN", establishmentId: "e1", permissions: "ALL" } as unknown as U;
  assert.equal(can(adminRoleNoPlatform), false);
});

test("la permission demandée est respectée (autre module que les abonnements)", () => {
  const u = platform(JSON.stringify(["PLATFORM_USERS"]));
  assert.equal(hasExplicitPlatformPermission(u, "PLATFORM_USERS"), true);
  assert.equal(hasExplicitPlatformPermission(u, "PLATFORM_SUBSCRIPTIONS"), false);
  assert.equal(hasExplicitPlatformPermission(platform(JSON.stringify(["PLATFORM_ALL"])), "PLATFORM_USERS"), true);
});

test("la fonction est pure : aucune modification de l'objet utilisateur, résultat identique à chaque appel", () => {
  const u = Object.freeze(platform(JSON.stringify(["PLATFORM_SUBSCRIPTIONS"])));
  const first = can(u);
  const second = can(u);
  assert.equal(first, true);
  assert.equal(second, true);
  assert.deepEqual(u, { isPlatformAdmin: true, permissions: '["PLATFORM_SUBSCRIPTIONS"]' });
});
