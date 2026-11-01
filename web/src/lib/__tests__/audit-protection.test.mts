// Lot 1 — protection des journaux d'audit.
//
// Isolation : AUCUNE base, AUCUN réseau. La transaction Prisma est une doublure qui consigne
// chaque appel ; `@/lib/prisma`, `@/lib/dal` et `server-only` sont remplacés. Ces tests prouvent
// la logique de code (ce qui est appelé, dans quel ordre, avec quelles données) ; ils ne
// prouvent PAS le comportement avec PostgreSQL (clés étrangères réelles).
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Call = { model: string; method: string; args: unknown };
const calls: Call[] = [];
let findManyArgs: { where?: { action?: { in?: string[] } | string } } | null = null;

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: {
      auditLog: {
        findMany: async (args: typeof findManyArgs) => {
          findManyArgs = args;
          return [];
        },
        count: async () => 0,
      },
    },
  },
  "@/lib/dal": { requirePlatformAdmin: async () => ({ id: "admin", isPlatformAdmin: true }) },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const { purgeUserFromDatabase } = await import("../user-purge");
const auditData = await import("../audit-log-data");
const { ACTION_LABELS } = await import("../../app/plateforme/historique/action-labels");

function makeFakeTx() {
  return new Proxy(
    {},
    {
      get(_t, model: string) {
        return new Proxy(
          {},
          {
            get(_m, method: string) {
              return async (args: unknown) => {
                calls.push({ model, method, args });
                if (model === "user" && method === "findUnique") {
                  return { id: "cible", email: "x@exemple.invalid", username: "cible", name: "Cible", isPlatformAdmin: false, establishmentId: "etab-1" };
                }
                if (model === "user" && method === "findFirst") return { id: "substitut" };
                return { count: 0 };
              };
            },
          }
        );
      },
    }
  ) as never;
}

const index = (model: string, method: string) => calls.findIndex((c) => c.model === model && c.method === method);

test("purge d'un utilisateur : l'auteur est détaché des journaux, jamais supprimés", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");

  const auditCalls = calls.filter((c) => c.model === "auditLog");
  assert.equal(auditCalls.length, 1, "un seul appel d'audit attendu");
  assert.equal(auditCalls[0].method, "updateMany");
  assert.deepEqual(auditCalls[0].args, { where: { userId: "cible" }, data: { userId: null } });
  assert.ok(!calls.some((c) => c.model === "auditLog" && /^delete/.test(c.method)), "aucune suppression d'audit");
});

test("purge : le détachement précède la suppression du compte (clé étrangère Restrict)", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");
  const detach = index("auditLog", "updateMany");
  const remove = index("user", "delete");
  assert.ok(detach >= 0 && remove >= 0);
  assert.ok(detach < remove, "auditLog.updateMany doit précéder user.delete");
});

test("purge : le reste du comportement est préservé (sessions, jetons, OTP, substitution, suppression)", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");
  for (const [model, method] of [
    ["session", "deleteMany"],
    ["notificationRead", "deleteMany"],
    ["passwordResetToken", "deleteMany"],
    ["otpVerification", "deleteMany"],
    ["cashSession", "updateMany"],
    ["bankAccount", "updateMany"],
    ["user", "delete"],
  ] as const) {
    assert.ok(index(model, method) >= 0, `${model}.${method} attendu`);
  }
});

// --- Lot 3B : demandes d'abonnement en attente du demandeur supprimé ---------------------------

test("purge : les demandes en attente du demandeur sont annulées avant la suppression du compte", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");

  const requestCalls = calls.filter((c) => c.model === "subscriptionChangeRequest");
  assert.equal(requestCalls.length, 1, "un seul appel sur subscriptionChangeRequest attendu");
  assert.equal(requestCalls[0].method, "updateMany");
  assert.ok(index("subscriptionChangeRequest", "updateMany") < index("user", "delete"), "l'annulation doit précéder user.delete");
});

test("purge : le filtre cible uniquement les demandes EN ATTENTE du demandeur supprimé", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");
  const call = calls.find((c) => c.model === "subscriptionChangeRequest");
  const args = call?.args as { where: Record<string, unknown>; data: Record<string, unknown> };
  assert.deepEqual(args.where, { requestedByUserId: "cible", status: "PENDING_SECOND_APPROVAL" });
});

test("purge : statut et date de décision sont écrits dans la MÊME instruction (status_fields_check)", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");
  const requestCalls = calls.filter((c) => c.model === "subscriptionChangeRequest");
  assert.equal(requestCalls.length, 1, "aucune mise à jour intermédiaire");
  const { data } = requestCalls[0].args as { data: Record<string, unknown> };
  assert.equal(data.status, "CANCELLED");
  assert.ok(data.decidedAt instanceof Date, "decidedAt doit être renseigné avec le statut");
  assert.equal(data.decisionReason, "Demandeur supprimé");
  assert.ok(!("decidedByUserId" in data), "le décideur reste NULL (annulation par le système)");
  assert.deepEqual(Object.keys(data).sort(), ["decidedAt", "decisionReason", "status"]);
});

test("purge : aucune demande n'est supprimée et la suppression du compte reste la dernière opération", async () => {
  calls.length = 0;
  await purgeUserFromDatabase(makeFakeTx(), "cible");
  assert.ok(
    !calls.some((c) => c.model === "subscriptionChangeRequest" && /^(delete|deleteMany|upsert|create|createMany)/.test(c.method)),
    "aucune suppression ni création de demande",
  );
  const last = calls[calls.length - 1];
  assert.deepEqual([last.model, last.method], ["user", "delete"]);
  // L'ordre existant est préservé : détachement de l'audit, annulation des demandes, jetons, suppression.
  assert.ok(index("auditLog", "updateMany") < index("subscriptionChangeRequest", "updateMany"));
  assert.ok(index("subscriptionChangeRequest", "updateMany") < index("passwordResetToken", "deleteMany"));
  assert.ok(index("passwordResetToken", "deleteMany") < index("user", "delete"));
});

test("aucun code applicatif (src/) ne supprime de demande d'abonnement", () => {
  const forbidden = [new RegExp("subscriptionChangeRequest\\s*\\.\\s*" + "delete"), new RegExp('DELETE\\s+FROM\\s+"?SubscriptionChangeRequest', "i")];
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const code = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const re of forbidden) if (re.test(code)) offenders.push(`${path.relative(SRC, file)} : ${re}`);
  }
  assert.deepEqual(offenders, []);
});

// --- Garde de régression sur le code source -------------------------------------------------

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "generated" || entry.name === "__tests__" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test("aucun code applicatif (src/) ne supprime ou n'écrase de journaux d'audit", () => {
  // Motifs construits par concaténation pour que ce fichier ne se détecte pas lui-même.
  const forbidden = [
    new RegExp("auditLog\\s*\\.\\s*" + "delete"),
    new RegExp("auditLog\\s*\\.\\s*" + "upsert"),
    new RegExp("DELETE\\s+FROM\\s+\"?AuditLog", "i"),
    new RegExp("TRUNCATE[^;]*AuditLog", "i"),
  ];
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const code = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const re of forbidden) if (re.test(code)) offenders.push(`${path.relative(SRC, file)} : ${re}`);
  }
  assert.deepEqual(offenders, []);
});

test("seul user-purge.ts modifie des journaux existants, et uniquement pour détacher l'auteur", () => {
  const writers: string[] = [];
  for (const file of walk(SRC)) {
    const code = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/auditLog\s*\.\s*update(Many)?\s*\(/.test(code)) writers.push(path.relative(SRC, file).replace(/\\/g, "/"));
  }
  assert.deepEqual(writers, ["lib/user-purge.ts"]);
});

test("journal de suppression d'utilisateur : ni nom ni identifiant de connexion de la personne supprimée", () => {
  for (const rel of ["app/actions/users.ts", "app/actions/establishment-approval.ts"]) {
    const source = fs.readFileSync(path.join(SRC, rel), "utf8");
    const start = source.indexOf('action: "USER_DELETED"');
    assert.ok(start > 0, `${rel} : journal USER_DELETED introuvable`);
    const block = source.slice(start, source.indexOf("establishmentId:", start));
    assert.doesNotMatch(block, /target\.(name|username)/, `${rel} : nom ou identifiant dans le journal`);
    assert.match(block, /entityId:\s*(userId|targetUserId)/, `${rel} : identifiant opaque attendu`);
    assert.match(block, /role/, `${rel} : le rôle doit être conservé`);
  }
});

test("chemin de suppression d'établissement : plus de suppression d'audit, gel du Lot 0 toujours actif", () => {
  const source = fs.readFileSync(path.join(SRC, "app/actions/establishment-approval.ts"), "utf8");
  const start = source.indexOf("export async function deleteEstablishment");
  const end = source.indexOf("export async function deletePlatformUser");
  const body = source.slice(start, end);
  assert.doesNotMatch(body.replace(/\/\/.*$/gm, ""), /auditLog\s*\.\s*delete/);
  assert.match(body, /if \(!ESTABLISHMENT_DELETION_ENABLED\)/);
});

// --- Historique des décisions --------------------------------------------------------------

test("liste blanche : les trois actions autorisées sont présentes, les actions reportées absentes", () => {
  const list = auditData.PLATFORM_DECISION_ACTIONS as readonly string[];
  for (const action of ["ESTABLISHMENT_DELETED", "SUBSCRIPTION_PROLONGED", "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED"]) {
    assert.ok(list.includes(action), `${action} manquante`);
  }
  for (const action of ["USER_DELETED", "PLATFORM_ADMIN_CREATED", "PLATFORM_PERMISSIONS_UPDATED"]) {
    assert.ok(!list.includes(action), `${action} ne doit pas être ajoutée dans ce lot`);
  }
  assert.equal(new Set(list).size, list.length, "doublon dans la liste blanche");
});

test("chaque action de la liste blanche a un libellé, et inversement (le filtre de l'interface en dérive)", () => {
  assert.deepEqual([...Object.keys(ACTION_LABELS)].sort(), [...auditData.PLATFORM_DECISION_ACTIONS].sort());
  for (const label of Object.values(ACTION_LABELS)) assert.ok(label.trim().length > 0);
});

test("listPlatformDecisions interroge exactement la liste blanche, y compris les nouvelles actions", async () => {
  findManyArgs = null;
  await auditData.listPlatformDecisions();
  const where = findManyArgs as unknown as { where: { action: { in: string[] } } } | null;
  assert.ok(where, "findMany non appelé");
  assert.deepEqual([...where.where.action.in].sort(), [...auditData.PLATFORM_DECISION_ACTIONS].sort());
});

test("filter-bar.tsx dérive ses options de ACTION_LABELS : aucune liste dupliquée à maintenir", () => {
  const source = fs.readFileSync(path.join(SRC, "app/plateforme/historique/filter-bar.tsx"), "utf8");
  assert.match(source, /Object\.keys\(ACTION_LABELS\)/);
  assert.doesNotMatch(source, /ESTABLISHMENT_DELETED|SUBSCRIPTION_PROLONGED/);
});
