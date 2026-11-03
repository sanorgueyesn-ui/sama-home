// Tests de l'exposition du code OTP (inscription d'établissement).
//
// Isolation : AUCUNE base, AUCUN réseau, AUCUN e-mail. Les actions serveur réelles
// (src/app/actions/establishment-registration.ts) sont exécutées avec des doublures
// en mémoire pour `@/lib/prisma`, `@/lib/mail` et `next/headers`. L'environnement
// (SAMA_ENV, NODE_ENV, DATABASE_URL…) est positionné test par test ; toutes les
// valeurs sont fictives. Ces tests prouvent la logique d'exposition du code et la
// conservation des protections ; ils ne prouvent PAS le comportement avec PostgreSQL
// ni avec un vrai fournisseur d'e-mail.
import test from "node:test";
import Module from "node:module";
import assert from "node:assert/strict";

type Env = Record<string, string | undefined>;
const env = process.env as Env;
env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/never_connected";
env.SESSION_SECRET = "test-only-secret";

const { canExposeTestOtp, resolveOtpDispatch } = await import("../test-otp");

const LOCAL_OK: Env = {
  SAMA_ENV: "local",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://u:p@127.0.0.1:55417/samahome_local_v17",
  SAMA_EXPECTED_DB: "samahome_local_v17",
};

// ----------------------------------------------------------------- décision pure
test("local explicitement autorisé : le code de test est exposable", () => {
  assert.equal(canExposeTestOtp(LOCAL_OK), true);
  assert.deepEqual(resolveOtpDispatch({ mailSent: false, code: "123456", env: LOCAL_OK }), {
    delivered: true,
    testCode: "123456",
  });
});

test("production : jamais de code, même si SAMA_ENV=local est posé", () => {
  assert.equal(canExposeTestOtp({ ...LOCAL_OK, NODE_ENV: "production" }), false);
  assert.equal(canExposeTestOtp({ NODE_ENV: "production" }), false);
  assert.deepEqual(resolveOtpDispatch({ mailSent: true, code: "123456", env: { NODE_ENV: "production" } }), {
    delivered: true,
  });
});

test("SAMA_ENV absent ou incohérent : aucun code exposé", () => {
  for (const sama of [undefined, "", "Local", "LOCAL", " local", "local ", "dev", "production", "true"]) {
    assert.equal(canExposeTestOtp({ ...LOCAL_OK, SAMA_ENV: sama }), false, `SAMA_ENV=${String(sama)}`);
  }
});

test("NODE_ENV=development seul ne suffit pas", () => {
  assert.equal(canExposeTestOtp({ NODE_ENV: "development" }), false);
  assert.equal(canExposeTestOtp({ NODE_ENV: "development", DATABASE_URL: LOCAL_OK.DATABASE_URL }), false);
});

test("NODE_ENV absent, test ou inattendu : aucun code exposé", () => {
  for (const node of [undefined, "", "test", "staging"]) {
    assert.equal(canExposeTestOtp({ ...LOCAL_OK, NODE_ENV: node }), false, `NODE_ENV=${String(node)}`);
  }
});

test("garde de configuration locale invalide : aucun code exposé", () => {
  assert.equal(
    canExposeTestOtp({ ...LOCAL_OK, DATABASE_URL: "postgresql://u:p@db.exemple-distant.invalid:5432/samahome_local_v17" }),
    false,
  );
  assert.equal(canExposeTestOtp({ ...LOCAL_OK, SAMA_EXPECTED_DB: "autre_base" }), false);
  assert.equal(canExposeTestOtp({ ...LOCAL_OK, SAMA_EXPECTED_DB: undefined }), false);
  assert.equal(canExposeTestOtp({ ...LOCAL_OK, DATABASE_URL: `${LOCAL_OK.DATABASE_URL}?host=db.exemple.invalid` }), false);
});

test("hors local, l'étape de saisie n'est autorisée que si l'e-mail est parti", () => {
  const prod = { NODE_ENV: "production" };
  assert.deepEqual(resolveOtpDispatch({ mailSent: false, code: "123456", env: prod }), { delivered: false });
  assert.deepEqual(resolveOtpDispatch({ mailSent: true, code: "123456", env: prod }), { delivered: true });
});

// ------------------------------------------------- actions serveur réelles, doublures
type OtpRow = {
  id: string;
  email: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  establishmentName: string;
  managerName: string;
  passwordHash: string;
  plan: string;
  createdAt: Date;
};

const db = {
  otp: [] as OtpRow[],
  events: [] as string[],
  establishments: 0,
  users: 0,
};
let mailSucceeds = true;
let mailCalls = 0;
let currentIp = "203.0.113.1";

function resetDb() {
  db.otp = [];
  db.events = [];
  db.establishments = 0;
  db.users = 0;
  mailCalls = 0;
}

const otpModel = {
  // Étape 2c-1 : supporte les filtres par e-mail (historique) ET par identifiant avec seuil d'essais,
  // et renvoie le nombre réel de lignes supprimées (les actions s'appuient dessus pour l'usage unique).
  deleteMany: async ({ where }: { where: { email?: string; id?: string; attempts?: { gte?: number } } }) => {
    const before = db.otp.length;
    db.otp = db.otp.filter((o) => {
      const matches =
        (where.email === undefined || o.email === where.email) &&
        (where.id === undefined || o.id === where.id) &&
        (where.attempts?.gte === undefined || o.attempts >= where.attempts.gte);
      return !matches;
    });
    db.events.push("otp.deleteMany");
    return { count: before - db.otp.length };
  },
  // Étape 2c-1 : mise à jour conditionnelle atomique (réservation d'un essai, remplacement du code).
  updateMany: async ({
    where,
    data,
  }: {
    where: { id: string; attempts?: { lt?: number }; expiresAt?: { gt?: Date } };
    data: { attempts?: number | { increment: number }; code?: string; expiresAt?: Date };
  }) => {
    const row = db.otp.find(
      (o) =>
        o.id === where.id &&
        (where.attempts?.lt === undefined || o.attempts < where.attempts.lt) &&
        (where.expiresAt?.gt === undefined || o.expiresAt.getTime() > where.expiresAt.gt.getTime()),
    );
    if (!row) return { count: 0 };
    if (data.code !== undefined) row.code = data.code;
    if (data.expiresAt !== undefined) row.expiresAt = data.expiresAt;
    if (typeof data.attempts === "number") row.attempts = data.attempts;
    else if (data.attempts) row.attempts += data.attempts.increment;
    db.events.push("otp.updateMany");
    return { count: 1 };
  },
  create: async ({ data }: { data: Omit<OtpRow, "id" | "attempts" | "createdAt"> }) => {
    const row: OtpRow = { id: `otp${db.otp.length + 1}`, attempts: 0, createdAt: new Date(), ...data };
    db.otp.push(row);
    db.events.push("otp.create");
    return row;
  },
  findFirst: async ({ where }: { where: { email: string } }) => [...db.otp].reverse().find((o) => o.email === where.email) ?? null,
  update: async ({ where, data }: { where: { id: string }; data: Partial<OtpRow> }) => {
    const row = db.otp.find((o) => o.id === where.id)!;
    Object.assign(row, data);
    db.events.push("otp.update");
    return row;
  },
  delete: async ({ where }: { where: { id: string } }) => {
    db.otp = db.otp.filter((o) => o.id !== where.id);
    db.events.push("otp.delete");
    return {};
  },
};

const membershipArgs: Array<{ userId: string; establishmentId: string; role: string }> = [];

const txModel = {
  user: {
    findFirst: async () => null,
    findUnique: async () => null,
    create: async () => {
      db.users += 1;
      db.events.push("user.create");
      return { id: "u1" };
    },
  },
  platformSettings: { findUnique: async () => null },
  pricingSettings: { findUnique: async () => null },
  establishment: {
    create: async () => {
      db.establishments += 1;
      db.events.push("establishment.create");
      return { id: "e1" };
    },
  },
  membership: {
    create: async ({ data }: { data: { userId: string; establishmentId: string; role: string } }) => {
      db.events.push("membership.create");
      membershipArgs.push(data);
      return {};
    },
  },
  auditLog: { create: async () => ({}) },
  subscription: { findUnique: async () => null, create: async () => ({ id: "s1" }) },
  expenseCategory: { createMany: async () => ({ count: 0 }) },
  otpVerification: otpModel,
};

const fakePrisma = {
  ...txModel,
  $transaction: async (cb: (tx: typeof txModel) => Promise<unknown>) => {
    db.events.push("transaction");
    return cb(txModel);
  },
};

// Substitution des dépendances par leur identifiant brut : les sources TypeScript du
// projet sont chargées comme des modules CommonJS (aucun "type": "module"), leurs
// `import "@/lib/prisma"` passent donc par Module._load, que l'on intercepte ici.
const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: fakePrisma },
  "@/lib/mail": {
    sendOtpEmail: async () => {
      mailCalls += 1;
      return { success: mailSucceeds, simulated: !mailSucceeds };
    },
    sendPasswordResetEmail: async () => ({ success: true, simulated: false }),
    // Étape 2c-2 : e-mail informatif (adresse déjà inscrite), sans code ; non exercé par ces tests.
    sendAccountExistsEmail: async () => ({ success: true, simulated: false }),
  },
  "next/headers": {
    cookies: async () => ({ get: () => undefined, delete: () => undefined }),
    headers: async () => new Headers({ "x-forwarded-for": currentIp }),
  },
  // Dépendances transitives (dal.ts, via subscription-data) : jamais utilisées par ces parcours.
  "next/navigation": { redirect: () => undefined, notFound: () => undefined },
  "next/cache": { revalidatePath: () => undefined },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const { registerEstablishment, verifyOtpAndRegister, resendOtpCode } = await import("../../app/actions/establishment-registration");
// Même module que celui utilisé par les actions : permet de remettre à zéro le plafond d'émissions par
// adresse (5 / 15 min, étape 2c-2) que ces tests, qui réutilisent la même adresse, épuiseraient sinon.
const { resetRateLimit } = await import("../rate-limit");

let ipCounter = 10;
function freshIp() {
  ipCounter += 1;
  currentIp = `203.0.113.${ipCounter}`;
}

function registrationForm(email = "test.inscription@exemple.invalid") {
  resetRateLimit(`otp-issue:${email.trim().toLowerCase()}`);
  const form = new FormData();
  form.set("establishmentName", "Résidence Test");
  form.set("managerName", "Gérant Test");
  form.set("email", email);
  form.set("password", "MotDePasse-Test-123!");
  form.set("plan", "FREE_TRIAL");
  return form;
}

function setEnv(values: Env) {
  for (const key of ["SAMA_ENV", "NODE_ENV", "SAMA_EXPECTED_DB"]) delete env[key];
  Object.assign(env, values);
  env.DATABASE_URL = values.DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/never_connected";
  env.SESSION_SECRET = "test-only-secret";
}

test("action : local autorisé → code fourni pour le parcours de test, même si l'e-mail est neutralisé", async () => {
  resetDb();
  freshIp();
  setEnv(LOCAL_OK);
  mailSucceeds = false; // relais et SMTP inertes en local
  const result = await registerEstablishment(undefined as never, registrationForm());
  assert.equal(result?.success, true);
  assert.equal(result && "requiresOtp" in result && result.requiresOtp, true);
  const stored = db.otp[0]!.code;
  assert.equal(result && "testCode" in result ? result.testCode : undefined, stored);
});

test("action : production → code absent de la réponse (e-mail envoyé)", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  mailSucceeds = true;
  const result = await registerEstablishment(undefined as never, registrationForm());
  assert.equal(result?.success, true);
  assert.equal(mailCalls, 1);
  const stored = db.otp[0]!.code;
  assert.ok(!("testCode" in (result ?? {})), "propriété testCode présente");
  assert.ok(!JSON.stringify(result).includes(stored), "le code apparaît dans la réponse");
});

test("action : production + échec d'envoi → aucun code divulgué, demande annulée, inscription non avancée", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  mailSucceeds = false;
  const result = await registerEstablishment(undefined as never, registrationForm());
  assert.notEqual(result?.success, true);
  assert.ok(!(result && "requiresOtp" in result && result.requiresOtp));
  assert.ok(result && "message" in result && typeof result.message === "string" && result.message.length > 0);
  assert.equal(db.otp.length, 0, "la demande OTP doit être supprimée");
  assert.equal(db.establishments + db.users, 0);
  const storedCodes = db.events.filter((e) => e === "otp.create").length;
  assert.equal(storedCodes, 1);
  assert.ok(!JSON.stringify(result).match(/\b\d{6}\b/), "un code à 6 chiffres apparaît dans la réponse");
});

test("action : SAMA_ENV absent avec NODE_ENV=development → aucun code, et échec d'envoi traité comme en production", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "development", DATABASE_URL: LOCAL_OK.DATABASE_URL, SAMA_EXPECTED_DB: "samahome_local_v17" });
  mailSucceeds = true;
  const ok = await registerEstablishment(undefined as never, registrationForm("a.exemple@exemple.invalid"));
  assert.ok(!("testCode" in (ok ?? {})));

  resetDb();
  mailSucceeds = false;
  const ko = await registerEstablishment(undefined as never, registrationForm("b.exemple@exemple.invalid"));
  assert.notEqual(ko?.success, true);
  assert.ok(!("testCode" in (ko ?? {})));
  assert.equal(db.otp.length, 0);
});

test("action : SAMA_ENV incohérent → aucun code", async () => {
  for (const sama of ["Local", "local ", "prod"]) {
    resetDb();
    freshIp();
    setEnv({ ...LOCAL_OK, SAMA_ENV: sama });
    mailSucceeds = true;
    const result = await registerEstablishment(undefined as never, registrationForm());
    assert.ok(!("testCode" in (result ?? {})), `SAMA_ENV=${sama}`);
  }
});

test("renvoi : production + échec d'envoi → aucun code, ancien code conservé", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  mailSucceeds = true;
  await registerEstablishment(undefined as never, registrationForm());
  const before = db.otp[0]!.code;
  mailSucceeds = false;
  const result = await resendOtpCode("test.inscription@exemple.invalid");
  // Étape 2c-2 : réponse publique GÉNÉRIQUE (identique à une demande absente) ; aucun code divulgué.
  assert.equal(result.success, true);
  assert.match(String(result.message), /Si votre demande est toujours en cours/);
  assert.ok(!("testCode" in result));
  assert.equal(db.otp[0]!.code, before, "l'ancien code doit rester le seul valide");
});

test("renvoi : production + e-mail envoyé → pas de code dans la réponse ; local → code fourni", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  mailSucceeds = true;
  await registerEstablishment(undefined as never, registrationForm());
  const prod = await resendOtpCode("test.inscription@exemple.invalid");
  assert.equal(prod.success, true);
  assert.ok(!("testCode" in prod));

  resetDb();
  freshIp();
  setEnv(LOCAL_OK);
  mailSucceeds = false;
  await registerEstablishment(undefined as never, registrationForm());
  const local = await resendOtpCode("test.inscription@exemple.invalid");
  assert.equal(local.success, true);
  assert.equal(local.testCode, db.otp[0]!.code);
});

// ------------------------------------------------------- protections conservées
test("protection : limitation de débit conservée (5 inscriptions par IP)", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  mailSucceeds = true;
  let last: Awaited<ReturnType<typeof registerEstablishment>> | undefined;
  for (let i = 0; i < 6; i += 1) last = await registerEstablishment(undefined as never, registrationForm(`rl${i}@exemple.invalid`));
  assert.ok(last && "message" in last && /Trop de tentatives/.test(String(last.message)));
});

function otpForm(email: string, code: string) {
  const form = new FormData();
  form.set("email", email);
  form.set("code", code);
  return form;
}

function seedOtp(overrides: Partial<OtpRow> = {}) {
  db.otp.push({
    id: "otpS",
    email: "verif@exemple.invalid",
    code: "424242",
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60_000),
    establishmentName: "Résidence Test",
    managerName: "Gérant Test",
    passwordHash: "hash-fictif",
    plan: "FREE_TRIAL",
    createdAt: new Date(),
    ...overrides,
  });
}

test("protection : code erroné → compteur d'essais incrémenté, aucun compte créé", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  seedOtp();
  const result = await verifyOtpAndRegister(undefined as never, otpForm("verif@exemple.invalid", "000000"));
  assert.ok(result && "errors" in result && result.errors?.code);
  assert.equal(db.otp[0]!.attempts, 1);
  assert.equal(db.establishments + db.users, 0);
});

test("protection : 5e essai erroné → demande réinitialisée", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  seedOtp({ attempts: 4 });
  const result = await verifyOtpAndRegister(undefined as never, otpForm("verif@exemple.invalid", "000000"));
  // Étape 2c-2 (D3) : message unique « Code invalide ou expiré », demande supprimée.
  assert.ok(result && "errors" in result && /Code invalide ou expiré/.test(String(result.errors?.code)));
  assert.equal(db.otp.length, 0);
});

test("protection : code expiré → refusé et supprimé", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  seedOtp({ expiresAt: new Date(Date.now() - 1000) });
  const result = await verifyOtpAndRegister(undefined as never, otpForm("verif@exemple.invalid", "424242"));
  assert.ok(result && "errors" in result && /Code invalide ou expiré/.test(String(result.errors?.code)));
  assert.equal(db.otp.length, 0);
  assert.equal(db.establishments + db.users, 0);
});

test("protection : bon code → établissement et compte créés dans UNE transaction, OTP consommé, statut actif tout de suite", async () => {
  resetDb();
  freshIp();
  setEnv({ NODE_ENV: "production" });
  seedOtp();
  const result = await verifyOtpAndRegister(undefined as never, otpForm("verif@exemple.invalid", "424242"));
  assert.equal(result?.success, true);
  assert.ok(result && "pendingApproval" in result && result.pendingApproval === false);
  assert.equal(db.establishments, 1);
  assert.equal(db.users, 1);
  assert.equal(db.otp.length, 0);
  const tx = db.events.indexOf("transaction");
  assert.ok(tx >= 0 && db.events.indexOf("establishment.create") > tx && db.events.indexOf("user.create") > tx);
  // Socle multi-espaces : l'appartenance du compte est créée dans la MÊME transaction, après lui.
  assert.ok(db.events.indexOf("membership.create") > db.events.indexOf("user.create"));
  // Le bon compte, le bon espace, le rôle ADMIN (ids renvoyés par les doublures user/establishment).
  assert.deepEqual(membershipArgs.at(-1), { userId: "u1", establishmentId: "e1", role: "ADMIN" });
  assert.ok(!JSON.stringify(result).includes("424242"));
});
