// Mode Agence immobilière suspendu : un interrupteur unique (AGENCY_MODE_ENABLED), le choix retiré
// partout où l'on peut créer un espace, le serveur qui refuse, et rien de supprimé pour pouvoir le
// rouvrir. Garde de source + règles pures ; aucune base.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AGENCY_MODE_ENABLED, fromShellMode, selectableBusinessModes, selectableShellModes, toShellMode } from "../business-mode";
import { EstablishmentRegistrationSchema } from "../definitions";

test("l'interrupteur est fermé : l'agence n'est plus proposable", () => {
  assert.equal(AGENCY_MODE_ENABLED, false);
  assert.deepEqual(selectableShellModes(), ["RESIDENCE", "HOTEL"]);
  assert.deepEqual(selectableBusinessModes(), ["HOTEL", "RESIDENCE"]);
});

test("l'interrupteur rouvert rétablit les trois modes, sans autre changement", () => {
  assert.deepEqual(selectableShellModes(true), ["RESIDENCE", "HOTEL", "AGENCY"]);
  assert.deepEqual(selectableBusinessModes(true), ["HOTEL", "RESIDENCE", "REAL_ESTATE"]);
});

test("les conversions de mode restent en place pour la réouverture", () => {
  assert.equal(fromShellMode("AGENCY"), "REAL_ESTATE");
  assert.equal(toShellMode("REAL_ESTATE"), "AGENCY");
  assert.equal(fromShellMode("HOTEL"), "HOTEL");
});

test("inscription : « AGENCY » est refusé par la validation serveur, hôtel et résidence passent, défaut résidence", () => {
  const shape = EstablishmentRegistrationSchema.shape.activityMode;
  assert.equal(shape.safeParse("AGENCY").success, false);
  assert.equal(shape.safeParse("IMMOBILIER").success, false);
  assert.equal(shape.safeParse("ADMIN").success, false);
  assert.equal(shape.safeParse("HOTEL").success, true);
  assert.equal(shape.safeParse("RESIDENCE").success, true);
  assert.equal(shape.parse(undefined), "RESIDENCE");
  const refused = shape.safeParse("AGENCY");
  if (!refused.success) assert.match(refused.error.issues[0].message, /pas disponible pour le moment/);
});

test("garde de source : le choix « Agence » n'est plus proposé dans l'inscription ni dans « ajouter un espace »", () => {
  const register = readFileSync("src/app/register/register-form.tsx", "utf8");
  assert.match(register, /AGENCY_MODE_ENABLED \? \(/, "le bouton Agence doit dépendre de l'interrupteur");
  assert.match(register, /AGENCY_MODE_ENABLED && \(m === "AGENCY"/, "un lien ?mode=AGENCY ne doit pas présélectionner l'agence");
  const addSpace = readFileSync("src/app/espaces/nouveau/add-space-form.tsx", "utf8");
  assert.match(addSpace, /selectableBusinessModes\(\)\.includes/);
});

test("garde de source : le tableau de bord et le menu n'honorent plus ?mode=AGENCY ; un espace agence existant reçoit un message", () => {
  const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
  assert.match(page, /AGENCY_MODE_ENABLED && \(value === "AGENCY"/);
  assert.match(page, /AgencySuspendedNotice/);
  assert.match(page, /AGENCY_MODE_ENABLED \? <DashboardAgencyView/);
  const shell = readFileSync("src/components/navigation/app-shell.tsx", "utf8");
  assert.match(shell, /AGENCY_MODE_ENABLED && \(value === "AGENCY"/);
});

test("rien n'est supprimé : le tableau de bord Agence, ses données et son schéma restent pour la réouverture", () => {
  assert.ok(readFileSync("src/components/dashboard/dashboard-agency-view.tsx", "utf8").includes("DashboardAgencyView"));
  assert.ok(readFileSync("prisma/schema.prisma", "utf8").includes("REAL_ESTATE"));
});
