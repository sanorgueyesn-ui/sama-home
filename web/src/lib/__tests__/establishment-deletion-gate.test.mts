// Lot 0 — gel de la suppression définitive d'un établissement.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une doublure
// dont TOUT accès lève une erreur ; `verifyPassword` est remplacé par une doublure qui
// consigne ses appels. Ces tests prouvent la garde serveur et le masquage du bouton ;
// ils ne prouvent rien sur le comportement avec PostgreSQL.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";

const touched: string[] = [];
const passwordChecks: string[] = [];

const forbidden = (name: string) =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        touched.push(`${name}.${String(prop)}`);
        throw new Error(`accès interdit à ${name}.${String(prop)}`);
      },
    }
  );

let platformUser: { id: string; isPlatformAdmin: boolean; permissions: string | null } = {
  id: "admin-plateforme",
  isPlatformAdmin: true,
  permissions: null,
};

const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: forbidden("prisma") },
  "@/lib/dal": { requirePlatformAdmin: async () => platformUser },
  "@/lib/password": {
    verifyPassword: async (plain: string) => {
      passwordChecks.push(plain);
      return true; // même un mot de passe « valide » ne doit rien débloquer
    },
  },
  "@/lib/user-purge": { purgeUserFromDatabase: async () => forbidden("user-purge") },
  "@/lib/establishment-activation": { createTrialSubscriptionAndAudit: async () => forbidden("activation") },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const gate = await import("../establishment-deletion-gate");
const actions = await import("../../app/actions/establishment-approval");

test("le drapeau de suppression est désactivé et le message est explicite", () => {
  assert.equal(gate.ESTABLISHMENT_DELETION_ENABLED, false);
  assert.match(gate.ESTABLISHMENT_DELETION_DISABLED_MESSAGE, /temporairement désactivée/);
  assert.match(gate.ESTABLISHMENT_DELETION_DISABLED_MESSAGE, /suspension/);
});

test("appel direct avec mot de passe valide : refus, aucune base ni mot de passe touchés", async () => {
  touched.length = 0;
  passwordChecks.length = 0;
  const result = await actions.deleteEstablishment("etablissement-quelconque", "mot-de-passe-fictif");
  assert.equal(result.error, gate.ESTABLISHMENT_DELETION_DISABLED_MESSAGE);
  assert.deepEqual(touched, [], "aucun accès Prisma attendu");
  assert.deepEqual(passwordChecks, [], "le mot de passe ne doit même pas être évalué");
});

test("appel direct sans identifiant ni mot de passe : même refus, rien n'est touché", async () => {
  touched.length = 0;
  passwordChecks.length = 0;
  const calls: Array<[string, string | undefined]> = [
    ["", undefined],
    ["id", undefined],
    ["id", ""],
    ["", "x"],
  ];
  for (const [id, password] of calls) {
    const result = await actions.deleteEstablishment(id, password);
    assert.equal(result.error, gate.ESTABLISHMENT_DELETION_DISABLED_MESSAGE);
  }
  assert.deepEqual(touched, []);
  assert.deepEqual(passwordChecks, []);
});

test("un administrateur de plateforme sans la permission reçoit toujours le refus d'autorisation", async () => {
  const saved = platformUser;
  platformUser = { id: "assistant", isPlatformAdmin: true, permissions: JSON.stringify(["PLATFORM_SUBSCRIPTIONS"]) };
  try {
    const result = await actions.deleteEstablishment("id", "mdp");
    assert.match(result.error ?? "", /autorisation/);
  } finally {
    platformUser = saved;
  }
  assert.deepEqual(touched, []);
});

test("la suspension et la réactivation restent exportées (non gelées)", () => {
  assert.equal(typeof actions.suspendEstablishment, "function");
  assert.equal(typeof actions.reactivateEstablishment, "function");
  assert.equal(typeof actions.approveEstablishment, "function");
  assert.equal(typeof actions.rejectEstablishment, "function");
});

test("garde serveur placée avant toute lecture de mot de passe ou de base (ordre dans le source)", () => {
  const source = fs.readFileSync(new URL("../../app/actions/establishment-approval.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function deleteEstablishment");
  const body = source.slice(start);
  const gateAt = body.indexOf("ESTABLISHMENT_DELETION_ENABLED");
  assert.ok(gateAt > 0, "garde absente");
  for (const sensitive of ["verifyPassword(", "prisma.user.findUnique", "prisma.$transaction"]) {
    assert.ok(body.indexOf(sensitive) > gateAt, `${sensitive} apparaît avant la garde`);
  }
  assert.ok(body.indexOf("requirePlatformAdmin()") < gateAt, "l'autorisation doit précéder la garde");
});

test("interface : bouton et fenêtre de suppression conditionnés par le drapeau, suspension intacte", () => {
  const ui = fs.readFileSync(
    new URL("../../app/plateforme/etablissements/establishment-lifecycle-buttons.tsx", import.meta.url),
    "utf8"
  );
  assert.match(ui, /from "@\/lib\/establishment-deletion-gate"/);
  const buttonAt = ui.indexOf('aria-label="Supprimer définitivement"');
  const modalAt = ui.indexOf("Mot de passe Administrateur");
  assert.ok(buttonAt > 0 && modalAt > 0);
  const beforeButton = ui.slice(0, buttonAt);
  assert.ok(
    beforeButton.lastIndexOf("{ESTABLISHMENT_DELETION_ENABLED ? (") > beforeButton.lastIndexOf("Suspendre"),
    "le bouton doit être dans un bloc conditionnel"
  );
  assert.match(ui, /ESTABLISHMENT_DELETION_ENABLED && showDeleteModal/);
  for (const kept of ["suspendEstablishment", "reactivateEstablishment", "Suspendre", "Réactiver"]) {
    assert.ok(ui.includes(kept), `${kept} doit rester présent`);
  }
});
