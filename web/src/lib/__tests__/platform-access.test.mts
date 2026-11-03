// Droits des administrateurs de la plateforme : compatibilité avec l'ancien format, rôles, validation,
// anti-escalade et lecture stricte.
import test from "node:test";
import assert from "node:assert/strict";
import {
  PLATFORM_CAPABILITIES,
  PLATFORM_ROLES,
  canGrant,
  effectivePlatformCapabilities,
  isFullPlatformAccess,
  parseCapabilitySelection,
  roleLabel,
  roleOf,
  summarizeAccess,
} from "../platform-access";
import { getFirstAuthorizedPlatformUrl, hasExplicitPlatformCapability, hasPlatformCapability, hasPlatformPermission } from "../permissions";

const admin = (permissions: string | null) => ({ isPlatformAdmin: true, permissions });
const json = (...ids: string[]) => JSON.stringify(ids);

test("aucun droit précisé, liste vide ou « tous » : super-administrateur (comme avant)", () => {
  for (const stored of [null, "", "  ", "[]", json("PLATFORM_ALL"), json("ALL")]) {
    assert.equal(isFullPlatformAccess(stored), true, String(stored));
  }
  assert.equal(effectivePlatformCapabilities(null).size, PLATFORM_CAPABILITIES.length);
});

test("ancien module = tous les droits de son domaine, rien de plus (les administrateurs actuels gardent leurs accès)", () => {
  const subs = effectivePlatformCapabilities(json("PLATFORM_SUBSCRIPTIONS"));
  assert.deepEqual([...subs].sort(), ["PAYMENTS_CONFIRM", "PAYMENTS_RECORD", "SUBSCRIPTIONS_ADJUST", "SUBSCRIPTIONS_VIEW"]);
  assert.equal(subs.has("ESTABLISHMENTS_LIFECYCLE"), false);
  assert.equal(hasPlatformPermission(admin(json("PLATFORM_ESTABLISHMENTS")), "PLATFORM_ESTABLISHMENTS"), true);
  assert.equal(hasPlatformPermission(admin(json("PLATFORM_ESTABLISHMENTS")), "PLATFORM_SUBSCRIPTIONS"), false);
  assert.equal(hasPlatformCapability(admin(json("PLATFORM_ESTABLISHMENTS")), "ESTABLISHMENTS_LIFECYCLE"), true);
});

test("agir donne aussi la consultation du domaine (sinon la page serait inaccessible)", () => {
  const caps = effectivePlatformCapabilities(json("ESTABLISHMENTS_DECIDE"));
  assert.equal(caps.has("ESTABLISHMENTS_VIEW"), true);
  assert.equal(caps.has("ESTABLISHMENTS_LIFECYCLE"), false);
  assert.equal(hasPlatformPermission(admin(json("ESTABLISHMENTS_DECIDE")), "PLATFORM_ESTABLISHMENTS"), true);
});

test("l'accès à une page n'accorde jamais une action sensible", () => {
  const support = admin(JSON.stringify(PLATFORM_ROLES.find((r) => r.id === "SUPPORT")!.capabilities));
  assert.equal(hasPlatformPermission(support, "PLATFORM_ESTABLISHMENTS"), true);
  assert.equal(hasPlatformCapability(support, "ESTABLISHMENTS_VIEW"), true);
  assert.equal(hasPlatformCapability(support, "ESTABLISHMENTS_DECIDE"), false);
  assert.equal(hasPlatformCapability(support, "ESTABLISHMENTS_LIFECYCLE"), false);
  assert.equal(hasPlatformCapability(support, "PAYMENTS_CONFIRM"), false);
  assert.equal(hasPlatformCapability(support, "USERS_MANAGE"), false);
});

test("un compte qui n'est pas administrateur de plateforme n'a jamais aucun droit", () => {
  assert.equal(hasPlatformCapability({ isPlatformAdmin: false, permissions: null }, "DASHBOARD_VIEW"), false);
  assert.equal(hasPlatformCapability(null, "DASHBOARD_VIEW"), false);
  assert.equal(hasExplicitPlatformCapability({ isPlatformAdmin: false, permissions: null }, "PAYMENTS_CONFIRM"), false);
});

test("lecture stricte : seule une liste bien formée et non vide accorde le droit ; null = pleins pouvoirs", () => {
  assert.equal(hasExplicitPlatformCapability(admin(null), "PAYMENTS_CONFIRM"), true);
  assert.equal(hasExplicitPlatformCapability(admin(json("PAYMENTS_CONFIRM")), "PAYMENTS_CONFIRM"), true);
  assert.equal(hasExplicitPlatformCapability(admin(json("PLATFORM_SUBSCRIPTIONS")), "PAYMENTS_CONFIRM"), true);
  assert.equal(hasExplicitPlatformCapability(admin(json("SUBSCRIPTIONS_VIEW")), "PAYMENTS_CONFIRM"), false);
  for (const bad of ["", "   ", "[]", "[[\"PAYMENTS_CONFIRM\"]]", "[\"PAYMENTS_CONFIRM\"", ","]) {
    assert.equal(hasExplicitPlatformCapability(admin(bad), "PAYMENTS_CONFIRM"), false, bad);
  }
  assert.equal(hasExplicitPlatformCapability({ isPlatformAdmin: true }, "PAYMENTS_CONFIRM"), false);
});

test("chaque rôle est reconnu, et le résumé dit ce qu'il peut et ne peut pas faire", () => {
  for (const role of PLATFORM_ROLES) {
    const stored = role.id === "SUPER_ADMIN" ? null : JSON.stringify(role.capabilities);
    assert.equal(roleOf(stored), role.id, role.id);
    assert.equal(roleLabel(stored), role.label);
    const { can, cannot } = summarizeAccess(stored);
    assert.equal(can.length + cannot.length, PLATFORM_CAPABILITIES.length);
  }
  assert.equal(roleLabel(json("DASHBOARD_VIEW")), "Accès personnalisé");
  assert.deepEqual(summarizeAccess(json("AUDIT_VIEW")).can, ["Consulter l'historique"]);
});

test("rôles : le responsable finance valide les règlements mais ne suspend rien ; l'auditeur ne modifie rien", () => {
  const finance = admin(JSON.stringify(PLATFORM_ROLES.find((r) => r.id === "FINANCE")!.capabilities));
  assert.equal(hasPlatformCapability(finance, "PAYMENTS_CONFIRM"), true);
  assert.equal(hasPlatformCapability(finance, "ESTABLISHMENTS_LIFECYCLE"), false);
  assert.equal(hasPlatformCapability(finance, "USERS_MANAGE"), false);
  const auditor = admin(JSON.stringify(PLATFORM_ROLES.find((r) => r.id === "AUDITOR")!.capabilities));
  for (const capability of PLATFORM_CAPABILITIES.filter((c) => c.level !== "view")) {
    assert.equal(hasPlatformCapability(auditor, capability.id), false, capability.id);
  }
});

test("sélection d'un formulaire : tout accepté seulement s'il est connu et non vide", () => {
  assert.deepEqual(parseCapabilitySelection("ALL", []), { ok: true, stored: null });
  const ok = parseCapabilitySelection("CUSTOM", ["PAYMENTS_CONFIRM", "PAYMENTS_CONFIRM"]);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    const stored = JSON.parse(ok.stored!) as string[];
    assert.ok(stored.includes("PAYMENTS_CONFIRM") && stored.includes("SUBSCRIPTIONS_VIEW"), "la consultation est ajoutée");
    assert.equal(new Set(stored).size, stored.length);
  }
  assert.equal(parseCapabilitySelection("CUSTOM", []).ok, false);
  assert.equal(parseCapabilitySelection("CUSTOM", ["PIRATE"]).ok, false);
  assert.equal(parseCapabilitySelection("CUSTOM", ["PLATFORM_ALL"]).ok, false, "pas de passe-droit par la liste libre");
  assert.equal(parseCapabilitySelection(undefined, ["DASHBOARD_VIEW"]).ok, false);
  assert.equal(parseCapabilitySelection("N'IMPORTE QUOI", ["DASHBOARD_VIEW"]).ok, false);
});

test("anti-escalade : on n'accorde que ce que l'on possède", () => {
  const support = JSON.stringify(PLATFORM_ROLES.find((r) => r.id === "SUPPORT")!.capabilities);
  const finance = JSON.stringify(PLATFORM_ROLES.find((r) => r.id === "FINANCE")!.capabilities);
  assert.equal(canGrant(null, finance), true);
  assert.equal(canGrant(null, null), true);
  assert.equal(canGrant(finance, null), false, "un administrateur limité ne crée pas de super-administrateur");
  assert.equal(canGrant(finance, support), false);
  assert.equal(canGrant(finance, json("SUBSCRIPTIONS_VIEW")), true);
});

test("première page autorisée après la connexion", () => {
  assert.equal(getFirstAuthorizedPlatformUrl(null), "/plateforme");
  assert.equal(getFirstAuthorizedPlatformUrl(json("AUDIT_VIEW")), "/plateforme/historique");
  assert.equal(getFirstAuthorizedPlatformUrl(json("PLATFORM_SUBSCRIPTIONS")), "/plateforme/abonnements");
});
