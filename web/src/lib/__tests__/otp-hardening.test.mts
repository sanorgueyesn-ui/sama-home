// Lot 2 / étape 2c-1 — sécurisation des OTP : compteurs atomiques, génération cryptographique,
// comparaison en temps constant, usage unique, limitation des tentatives.
//
// Isolation : AUCUNE base, AUCUN réseau, AUCUN e-mail, AUCUN secret. Les actions serveur RÉELLES
// (forgot-password.ts, establishment-registration.ts) sont exécutées avec des doublures en mémoire.
// Une barrière force de VRAIES courses : toutes les lectures ont lieu avant la première écriture.
// La limitation de débit réelle (en mémoire) est utilisée, sauf dans les tests de concurrence où
// elle est neutralisée pour isoler le compteur d'essais. Ces tests prouvent la logique ; ils ne
// prouvent PAS le comportement avec PostgreSQL (verrous de ligne, isolation des transactions).
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Env = Record<string, string | undefined>;
const env = process.env as Env;
env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/never_connected";
env.SESSION_SECRET = "test-only-secret";
env.NODE_ENV = "production";
delete env.SAMA_ENV;

// --- Données en mémoire ---------------------------------------------------------------------
type OtpRow = {
  id: string;
  email: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  establishmentName: string;
  businessMode?: string;
  managerName: string;
  passwordHash: string;
  plan: string;
  createdAt: Date;
};
type TokenRow = { id: string; email: string; code: string; attempts: number; expiresAt: Date; createdAt: Date };
type UserRow = { id: string; email: string | null; name: string; username: string; establishmentId: string | null };

const db = {
  otp: [] as OtpRow[],
  tokens: [] as TokenRow[],
  events: [] as string[],
  establishments: 0,
  users: 0,
  memberships: 0,
  membershipArgs: [] as Array<{ userId: string; establishmentId: string; role: string }>,
  passwordUpdates: 0,
  sessionsDeleted: 0,
  tokenFindCalls: 0,
  otpFindCalls: 0,
  tokenClaims: 0,
  otpClaims: 0,
  maxTokenAttempts: 0,
  maxOtpAttempts: 0,
  mails: 0,
  infoMails: 0,
  infoMailTo: [] as string[],
  hashCalls: 0,
};
let userForLookup: UserRow | null = null;
let mailThrows = false;
let tokenCreateFails = false;
let googleCookie: string | undefined;
let mailSucceeds = true;
let rateBypass = false;
let currentIp = "198.51.100.1";
let readGate: { arrive: () => Promise<void> } | null = null;
let afterOtpFind: (() => void) | null = null;

function makeBarrier(parties: number) {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  return {
    arrive: async () => {
      if (++arrived >= parties) release();
      await gate;
    },
  };
}

let seq = 0;
function freshIp() {
  seq += 1;
  currentIp = `198.51.${Math.floor(seq / 250) + 100}.${(seq % 250) + 1}`;
}
function uniq(prefix: string) {
  seq += 1;
  return `${prefix}${seq}@exemple.invalid`;
}

function resetState() {
  db.otp = [];
  db.tokens = [];
  db.events = [];
  db.establishments = 0;
  db.users = 0;
  db.memberships = 0;
  db.membershipArgs = [];
  db.passwordUpdates = 0;
  db.sessionsDeleted = 0;
  db.tokenFindCalls = 0;
  db.otpFindCalls = 0;
  db.tokenClaims = 0;
  db.otpClaims = 0;
  db.maxTokenAttempts = 0;
  db.maxOtpAttempts = 0;
  db.mails = 0;
  db.infoMails = 0;
  db.infoMailTo = [];
  db.hashCalls = 0;
  userForLookup = null;
  mailThrows = false;
  tokenCreateFails = false;
  googleCookie = undefined;
  mailSucceeds = true;
  rateBypass = false;
  readGate = null;
  afterOtpFind = null;
  freshIp();
}

type TokenWhere = { id?: string; email?: { equals: string }; attempts?: { gte?: number; lt?: number }; expiresAt?: { gt?: Date } };

const tokenModel = {
  findFirst: async ({ where }: { where: { email: { equals: string } } }) => {
    db.tokenFindCalls += 1;
    const found = [...db.tokens].reverse().find((t) => t.email.toLowerCase() === where.email.equals.toLowerCase());
    const snapshot = found ? { ...found } : null; // lecture « périmée » : copie
    if (readGate) await readGate.arrive();
    return snapshot;
  },
  create: async ({ data }: { data: Omit<TokenRow, "id" | "createdAt" | "attempts"> & { attempts?: number } }) => {
    if (tokenCreateFails) throw new Error("écriture impossible");
    const row: TokenRow = { id: `tk${db.tokens.length + 1}`, attempts: 0, createdAt: new Date(), ...data };
    db.tokens.push(row);
    return row;
  },
  deleteMany: async ({ where }: { where: TokenWhere }) => {
    const before = db.tokens.length;
    db.tokens = db.tokens.filter((t) => {
      const matches =
        (where.id === undefined || t.id === where.id) &&
        (where.email === undefined || t.email.toLowerCase() === where.email.equals.toLowerCase()) &&
        (where.attempts?.gte === undefined || t.attempts >= where.attempts.gte);
      return !matches;
    });
    return { count: before - db.tokens.length };
  },
  updateMany: async ({ where, data }: { where: TokenWhere; data: { attempts: { increment: number } } }) => {
    const row = db.tokens.find(
      (t) =>
        t.id === where.id &&
        (where.attempts?.lt === undefined || t.attempts < where.attempts.lt) &&
        (where.expiresAt?.gt === undefined || t.expiresAt.getTime() > where.expiresAt.gt.getTime()),
    );
    if (!row) return { count: 0 };
    row.attempts += data.attempts.increment;
    db.tokenClaims += 1;
    db.maxTokenAttempts = Math.max(db.maxTokenAttempts, row.attempts);
    return { count: 1 };
  },
  delete: async () => {
    throw new Error("delete interdit : doit être deleteMany (aucune erreur si la ligne a disparu)");
  },
  update: async () => {
    throw new Error("update interdit : l'incrément doit être conditionnel et atomique (updateMany)");
  },
};

type OtpWhere = { id?: string; email?: string; attempts?: { gte?: number; lt?: number }; expiresAt?: { gt?: Date } };

const otpModel = {
  deleteMany: async ({ where }: { where: OtpWhere }) => {
    const before = db.otp.length;
    db.otp = db.otp.filter((o) => {
      const matches =
        (where.id === undefined || o.id === where.id) &&
        (where.email === undefined || o.email === where.email) &&
        (where.attempts?.gte === undefined || o.attempts >= where.attempts.gte);
      return !matches;
    });
    db.events.push("otp.deleteMany");
    return { count: before - db.otp.length };
  },
  create: async ({ data }: { data: Omit<OtpRow, "id" | "attempts" | "createdAt"> }) => {
    const row: OtpRow = { id: `otp${db.otp.length + 1}`, attempts: 0, createdAt: new Date(), ...data };
    db.otp.push(row);
    return row;
  },
  findFirst: async ({ where }: { where: { email: string } }) => {
    db.otpFindCalls += 1;
    const found = [...db.otp].reverse().find((o) => o.email === where.email);
    const snapshot = found ? { ...found } : null;
    if (readGate) await readGate.arrive();
    if (afterOtpFind) afterOtpFind();
    return snapshot;
  },
  updateMany: async ({
    where,
    data,
  }: {
    where: OtpWhere;
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
    else if (data.attempts) {
      row.attempts += data.attempts.increment;
      db.otpClaims += 1;
      db.maxOtpAttempts = Math.max(db.maxOtpAttempts, row.attempts);
    }
    db.events.push("otp.updateMany");
    return { count: 1 };
  },
  update: async () => {
    throw new Error("update interdit : le remplacement/l'incrément doit passer par updateMany");
  },
  delete: async () => {
    throw new Error("delete interdit : doit être deleteMany");
  },
};

// Lot E : arguments reçus par `establishment.create` (le mode choisi doit y figurer).
const establishmentCreates: Array<Record<string, unknown>> = [];

const txModel = {
  user: {
    findFirst: async () => null,
    findUnique: async () => null,
    create: async () => {
      db.users += 1;
      return { id: "u-new" };
    },
    update: async () => {
      db.passwordUpdates += 1;
      return {};
    },
  },
  session: {
    deleteMany: async () => {
      db.sessionsDeleted += 1;
      return { count: 1 };
    },
  },
  platformSettings: { findUnique: async () => null },
  pricingSettings: { findUnique: async () => null },
  establishment: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      db.establishments += 1;
      establishmentCreates.push(data);
      return { id: "e-new" };
    },
  },
  membership: {
    create: async ({ data }: { data: { userId: string; establishmentId: string; role: string } }) => {
      db.memberships += 1;
      db.membershipArgs.push(data);
      return {};
    },
  },
  auditLog: { create: async () => ({}) },
  subscription: { findUnique: async () => null },
  otpVerification: otpModel,
  passwordResetToken: tokenModel,
};

const fakePrisma = {
  ...txModel,
  user: {
    ...txModel.user,
    // Recherche du compte (réinitialisation) : `userForLookup` ; inscription : aucun compte existant.
    findFirst: async () => userForLookup,
  },
  $transaction: async (cb: (tx: typeof txModel) => Promise<unknown>) => cb(txModel),
};

// Module réel de limitation, chargé après l'installation des doublures (référence objet : les
// doublures l'appellent à l'exécution).
const rateRef: { current?: typeof import("../rate-limit") } = {};
const realRate = {
  checkRateLimit: (key: string, limit: number, windowSeconds: number) => rateRef.current!.checkRateLimit(key, limit, windowSeconds),
  resetRateLimit: (key: string) => rateRef.current!.resetRateLimit(key),
  getClientIp: () => rateRef.current!.getClientIp(),
};
const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: fakePrisma },
  "@/lib/mail": {
    sendOtpEmail: async () => {
      db.mails += 1;
      if (mailThrows) throw new Error("panne du service d'e-mail");
      return { success: mailSucceeds, simulated: !mailSucceeds };
    },
    sendPasswordResetEmail: async () => {
      db.mails += 1;
      if (mailThrows) throw new Error("panne du service d'e-mail");
      return { success: mailSucceeds, simulated: !mailSucceeds };
    },
    // Message informatif (adresse déjà inscrite) : jamais de code.
    sendAccountExistsEmail: async (args: { to: string }) => {
      db.infoMails += 1;
      db.infoMailTo.push(args.to);
      if (mailThrows) throw new Error("panne du service d'e-mail");
      return { success: mailSucceeds, simulated: !mailSucceeds };
    },
  },
  "@/lib/password": {
    hashPassword: async () => {
      db.hashCalls += 1;
      return "hash-fictif";
    },
    verifyPassword: async () => true,
  },
  "@/lib/rate-limit": {
    checkRateLimit: (key: string, limit: number, windowSeconds: number) =>
      rateBypass ? { allowed: true, remaining: 99, retryAfterSeconds: 0 } : realRate.checkRateLimit(key, limit, windowSeconds),
    resetRateLimit: (key: string) => realRate.resetRateLimit(key),
    getClientIp: () => realRate.getClientIp(),
  },
  "next/headers": {
    cookies: async () => ({
      get: (name: string) => (name === "google_auth_token" && googleCookie ? { name, value: googleCookie } : undefined),
      delete: () => undefined,
    }),
    headers: async () => new Headers({ "x-forwarded-for": currentIp }),
  },
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

rateRef.current = await import("../rate-limit");
const otp = await import("../otp");
const reset = await import("../../app/actions/forgot-password");
const registration = await import("../../app/actions/establishment-registration");
const sessionToken = await import("../session-token");

// --- Aides de test -----------------------------------------------------------------------------
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

// Adresse unique par test : la limitation de débit réelle (par adresse) persiste dans le processus.
let tokenEmail = "reset@exemple.invalid";
function seedToken(overrides: Partial<TokenRow> = {}) {
  tokenEmail = overrides.email ?? uniq("reset-");
  const row: TokenRow = {
    id: "tk-seed",
    email: tokenEmail,
    code: "424242",
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60_000),
    createdAt: new Date(),
    ...overrides,
  };
  db.tokens.push(row);
  userForLookup = { id: "u1", email: row.email, name: "Utilisateur Test", username: "utilisateur", establishmentId: "e1" };
  return row;
}
function confirmForm(code: string, email = tokenEmail, password = "TEST_ONLY_NEW_PASSWORD") {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("code", code);
  fd.set("newPassword", password);
  fd.set("confirmPassword", password);
  return fd;
}
function seedOtp(overrides: Partial<OtpRow> = {}) {
  const row: OtpRow = {
    id: "otp-seed",
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
  };
  db.otp.push(row);
  return row;
}
function otpForm(email: string, code: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("code", code);
  return fd;
}
function registrationForm(email: string) {
  const fd = new FormData();
  fd.set("establishmentName", "Résidence Test");
  fd.set("managerName", "Gérant Test");
  fd.set("email", email);
  fd.set("password", "MotDePasse-Test-123!");
  fd.set("plan", "FREE_TRIAL");
  return fd;
}
// Textes publics de l'étape 2c-2 (D1 à D4).
const GENERIC_CODE = "Code invalide ou expiré. Vérifiez le code reçu ou demandez-en un nouveau.";
const GENERIC_RESEND =
  "Si votre demande est toujours en cours, un nouveau code vient d'être envoyé. Pensez à vérifier vos courriers indésirables.";
const GENERIC_RESET =
  "Vérifiez votre boîte e-mail. Si un compte correspond aux informations saisies, un code de sécurité à 6 chiffres vient de vous être envoyé à l'adresse e-mail associée. Ce code est valable 15 minutes. Pensez à vérifier vos courriers indésirables.";
const verify = (email: string, code: string) => registration.verifyOtpAndRegister(undefined as never, otpForm(email, code));
const confirm = (code: string, email?: string) => reset.confirmPasswordReset(undefined, confirmForm(code, email));
const errorText = (r: unknown) => JSON.stringify(r ?? {});

// =============================================================================================
// A. Primitives (src/lib/otp.ts)
// =============================================================================================

test("génération : toujours 6 chiffres, de 100000 à 999999, sans zéro initial (format public inchangé)", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20_000; i += 1) {
    const code = otp.generateOtpCode();
    assert.match(code, /^[1-9][0-9]{5}$/);
    const n = Number(code);
    assert.ok(n >= 100_000 && n <= 999_999);
    seen.add(code);
  }
  assert.ok(seen.size > 5_000, "la distribution doit être très variée");
});

test("génération : n'utilise jamais Math.random (rendue inutilisable pendant le test)", () => {
  const original = Math.random;
  Math.random = () => {
    throw new Error("Math.random interdit pour les OTP");
  };
  try {
    for (let i = 0; i < 200; i += 1) assert.match(otp.generateOtpCode(), /^[0-9]{6}$/);
  } finally {
    Math.random = original;
  }
});

test("validation de format et comparaison : refus sans exception pour toute entrée mal formée", () => {
  assert.equal(otp.OTP_MAX_ATTEMPTS, 5);
  const good = "123456";
  assert.equal(otp.isWellFormedOtp(good), true);
  assert.equal(otp.safeEqualOtp(good, "123456"), true);
  assert.equal(otp.safeEqualOtp(good, "123457"), false);
  assert.equal(otp.safeEqualOtp("000123", "000123"), true, "zéros initiaux conservés si présents");

  const malformed: unknown[] = ["", "12345", "1234567", "12345a", " 123456", "123456 ", "12 456", "123456\n", "１２３４５６", "١٢٣٤٥٦", "-12345", "1e5000", null, undefined, 123456, {}, [], ["123456"], "x".repeat(10_000)];
  for (const value of malformed) {
    assert.equal(otp.isWellFormedOtp(value), false, JSON.stringify(value)?.slice(0, 30));
    assert.doesNotThrow(() => otp.safeEqualOtp(good, value));
    assert.equal(otp.safeEqualOtp(good, value), false);
    assert.equal(otp.safeEqualOtp(value, good), false, "valeur attendue mal formée : jamais égale");
  }
});

test("garde de source : OTP via crypto.randomInt et timingSafeEqual ; plus de Math.random pour les codes ni de comparaison directe", () => {
  const otpSource = read("lib/otp.ts");
  assert.match(otpSource, /randomInt\(/);
  assert.match(otpSource, /timingSafeEqual\(/);
  assert.doesNotMatch(otpSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), /Math\.random/);

  const forgot = read("app/actions/forgot-password.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const registrationSource = read("app/actions/establishment-registration.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(forgot, /Math\.random/);
  for (const line of registrationSource.split("\n").filter((l) => l.includes("Math.random"))) {
    assert.match(line, /SH-/, "seule la référence publique « SH-… » (hors OTP) peut encore utiliser Math.random");
  }
  for (const source of [forgot, registrationSource]) {
    assert.match(source, /from "@\/lib\/otp"/);
    assert.doesNotMatch(source, /\.code\s*[!=]==?\s*code\b/, "comparaison directe du code interdite");
    assert.doesNotMatch(source, /passwordResetToken\.(delete|update)\(|otpVerification\.(delete|update)\(/, "delete/update non atomiques interdits");
  }
});

// =============================================================================================
// B. Réinitialisation du mot de passe : confirmation
// =============================================================================================

test("réinitialisation : code faux → un essai consommé, message d'essais restants, mot de passe inchangé", async () => {
  resetState();
  const token = seedToken();
  const result = await confirm("111111");
  assert.match(errorText(result), /Code invalide ou expiré/);
  assert.doesNotMatch(errorText(result), /Il vous reste|tentative/, "plus de compteur d'essais communiqué");
  assert.equal(token.attempts, 1);
  assert.equal(db.passwordUpdates, 0);
});

test("réinitialisation : 5 codes faux en séquence → jeton supprimé ; ensuite même le bon code est refusé", async () => {
  resetState();
  seedToken();
  for (let i = 0; i < 5; i += 1) await confirm(`11111${i}`);
  assert.equal(db.tokens.length, 0, "jeton épuisé supprimé");
  assert.equal(db.maxTokenAttempts, 5);
  const late = await confirm("424242");
  assert.match(errorText(late), /Code invalide ou expiré/);
  assert.equal(db.passwordUpdates, 0);
});

test("réinitialisation : 40 requêtes PARALLÈLES avec des codes faux → au plus 5 essais, compteur jamais > 5", async () => {
  resetState();
  rateBypass = true;
  seedToken();
  readGate = makeBarrier(40);
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => confirm(String(100000 + i))));
  readGate = null;
  assert.equal(db.tokenClaims, 5, "exactement 5 essais réservés");
  assert.ok(db.maxTokenAttempts <= 5, `compteur ${db.maxTokenAttempts}`);
  assert.equal(results.length, 40);
  assert.equal(db.passwordUpdates, 0);
  assert.equal(db.tokens.length, 0, "jeton épuisé supprimé");
  const late = await confirm("424242");
  assert.match(errorText(late), /Code invalide ou expiré/);
  assert.equal(db.passwordUpdates, 0);
});

test("réinitialisation : 39 faux + 1 bon code en parallèle → jamais plus de 5 essais ni plus d'un changement de mot de passe", async () => {
  resetState();
  rateBypass = true;
  seedToken();
  readGate = makeBarrier(40);
  const forms = [...Array.from({ length: 39 }, (_, i) => String(100000 + i)), "424242"];
  await Promise.all(forms.map((code) => confirm(code)));
  readGate = null;
  assert.ok(db.tokenClaims <= 5);
  assert.ok(db.maxTokenAttempts <= 5);
  assert.ok(db.passwordUpdates <= 1);
});

test("réinitialisation : usage unique — deux requêtes parallèles avec le bon code → un seul changement de mot de passe", async () => {
  resetState();
  rateBypass = true;
  seedToken();
  readGate = makeBarrier(2);
  const [a, b] = await Promise.all([confirm("424242"), confirm("424242")]);
  readGate = null;
  assert.equal(db.passwordUpdates, 1, "un seul changement");
  assert.equal(db.sessionsDeleted, 1, "sessions révoquées une seule fois");
  const outcomes = [a, b].map((r) => r?.step);
  assert.deepEqual(outcomes.sort(), ["CODE", "SUCCESS"]);
  assert.match(errorText([a, b]), /Code invalide ou expiré/);
  assert.equal(db.tokens.length, 0);
});

test("réinitialisation : bon code → succès, sessions révoquées, jeton supprimé ; rejeu impossible", async () => {
  resetState();
  seedToken();
  const ok = await confirm("424242");
  assert.equal(ok?.step, "SUCCESS");
  assert.equal(db.passwordUpdates, 1);
  assert.equal(db.sessionsDeleted, 1);
  assert.equal(db.tokens.length, 0);
  const replay = await confirm("424242");
  assert.match(errorText(replay), /Code invalide ou expiré/);
  assert.equal(db.passwordUpdates, 1);
});

test("réinitialisation : code expiré → refusé et supprimé, aucun essai réservé ; jeton absent → refusé", async () => {
  resetState();
  seedToken({ expiresAt: new Date(Date.now() - 1000) });
  const expired = await confirm("424242");
  assert.match(errorText(expired), /expiré/);
  assert.equal(db.tokens.length, 0);
  assert.equal(db.tokenClaims, 0);
  const absent = await confirm("424242");
  assert.match(errorText(absent), /Code invalide ou expiré/);
  assert.equal(db.passwordUpdates, 0);
});

test("réinitialisation : codes mal formés → refusés sans consommer d'essai ni lever d'exception", async () => {
  resetState();
  const token = seedToken();
  for (const bad of ["12345", "abcdef", "1234567", "12 456", "١٢٣٤٥٦", ""]) {
    const result = await confirm(bad);
    assert.match(errorText(result), /6 chiffres/, bad);
  }
  assert.equal(token.attempts, 0);
  assert.equal(db.tokenClaims, 0);
  assert.equal(db.passwordUpdates, 0);
});

// --- Limitation de débit : réinitialisation ----------------------------------------------------

test("limite IP de la confirmation : 15 appels / 15 min, le 16e est refusé avant tout accès à la base", async () => {
  resetState();
  seedToken();
  const email = uniq("limite-ip-");
  for (let i = 0; i < 15; i += 1) await confirm("111111", email);
  const findsBefore = db.tokenFindCalls;
  const blocked = await confirm("111111", email);
  assert.match(errorText(blocked), /Trop de tentatives de validation/);
  assert.equal(db.tokenFindCalls, findsBefore, "aucun accès aux jetons une fois la limite atteinte");
});

test("limite par adresse de la confirmation : 10 appels / 15 min même depuis des IP différentes ; casse sans effet", async () => {
  resetState();
  const email = uniq("limite-adresse-");
  for (let i = 0; i < 10; i += 1) {
    freshIp();
    await confirm("111111", i % 2 ? email.toUpperCase() : email);
  }
  freshIp();
  const findsBefore = db.tokenFindCalls;
  const blocked = await confirm("111111", email);
  assert.match(errorText(blocked), /Trop de tentatives de validation/);
  assert.equal(db.tokenFindCalls, findsBefore);
});

test("limite par identifiant de la demande : 5 demandes / 15 min, appliquée de façon identique compte existant ou non", async () => {
  const messages: string[] = [];
  for (const exists of [true, false]) {
    resetState();
    const identifier = uniq(exists ? "demande-existe-" : "demande-inconnu-");
    userForLookup = exists ? { id: "u1", email: identifier, name: "Test", username: "t", establishmentId: null } : null;
    for (let i = 0; i < 5; i += 1) {
      freshIp();
      const fd = new FormData();
      fd.set("identifier", i % 2 ? identifier.toUpperCase() : identifier);
      await reset.requestPasswordReset(undefined, fd);
    }
    freshIp();
    const fd = new FormData();
    fd.set("identifier", identifier);
    const sixth = await reset.requestPasswordReset(undefined, fd);
    assert.match(errorText(sixth), /Trop de tentatives de réinitialisation/);
    messages.push(String(sixth.error));
  }
  assert.equal(messages[0], messages[1], "même message que le compte existe ou non");
});

test("demande de réinitialisation : code généré sans Math.random, 6 chiffres, valable 15 min", async () => {
  resetState();
  userForLookup = { id: "u1", email: "demande@exemple.invalid", name: "Test", username: "t", establishmentId: null };
  const original = Math.random;
  Math.random = () => {
    throw new Error("Math.random interdit pour les OTP");
  };
  try {
    const fd = new FormData();
    fd.set("identifier", "demande@exemple.invalid");
    const result = await reset.requestPasswordReset(undefined, fd);
    assert.equal(result.step, "CODE");
  } finally {
    Math.random = original;
  }
  assert.equal(db.tokens.length, 1);
  assert.match(db.tokens[0]!.code, /^[1-9][0-9]{5}$/);
  const minutes = (db.tokens[0]!.expiresAt.getTime() - Date.now()) / 60_000;
  assert.ok(minutes > 14.9 && minutes <= 15);
  assert.equal(db.mails, 1);
});

// =============================================================================================
// C. Inscription : vérification et renvoi du code
// =============================================================================================

test("inscription : 40 requêtes PARALLÈLES avec des codes faux → au plus 5 essais ; ensuite le bon code est refusé", async () => {
  resetState();
  rateBypass = true;
  seedOtp();
  readGate = makeBarrier(40);
  await Promise.all(Array.from({ length: 40 }, (_, i) => verify("verif@exemple.invalid", String(100000 + i))));
  readGate = null;
  assert.equal(db.otpClaims, 5, "exactement 5 essais réservés");
  assert.ok(db.maxOtpAttempts <= 5);
  assert.equal(db.otp.length, 0, "demande épuisée supprimée");
  const late = await verify("verif@exemple.invalid", "424242");
  assert.match(errorText(late), /Code invalide ou expiré/);
  assert.equal(db.establishments + db.users, 0);
});

test("inscription : usage unique — deux requêtes parallèles avec le bon code → un seul établissement et un seul compte", async () => {
  resetState();
  rateBypass = true;
  seedOtp();
  readGate = makeBarrier(2);
  const results = await Promise.all([verify("verif@exemple.invalid", "424242"), verify("verif@exemple.invalid", "424242")]);
  readGate = null;
  assert.equal(db.establishments, 1);
  assert.equal(db.users, 1);
  // Socle multi-espaces : un compte créé = exactement une appartenance, même sous concurrence.
  assert.equal(db.memberships, 1);
  // Le bon compte, le bon espace, le rôle ADMIN (ids renvoyés par les doublures user/establishment).
  assert.deepEqual(db.membershipArgs, [{ userId: "u-new", establishmentId: "e-new", role: "ADMIN" }]);
  assert.equal(results.filter((r) => r?.success === true).length, 1);
  assert.equal(db.otp.length, 0);
});

test("inscription : 5e essai faux → demande supprimée ; code mal formé → refusé sans consommer d'essai", async () => {
  resetState();
  const row = seedOtp({ attempts: 4 });
  const bad = await verify("verif@exemple.invalid", "12ab56");
  assert.match(errorText(bad), /6 chiffres/);
  assert.equal(row.attempts, 4);
  assert.equal(db.otpClaims, 0);
  const fifth = await verify("verif@exemple.invalid", "000000");
  assert.match(errorText(fifth), /Code invalide ou expiré/);
  assert.equal(db.otp.length, 0);
});

test("inscription : code expiré → supprimé sans essai réservé ; bon code → compte créé et demande consommée", async () => {
  resetState();
  seedOtp({ expiresAt: new Date(Date.now() - 1000) });
  const expired = await verify("verif@exemple.invalid", "424242");
  assert.match(errorText(expired), /expiré/);
  assert.equal(db.otp.length, 0);
  assert.equal(db.otpClaims, 0);

  resetState();
  seedOtp();
  const ok = await verify("verif@exemple.invalid", "424242");
  assert.equal(ok?.success, true);
  assert.equal(db.establishments, 1);
  assert.equal(db.otp.length, 0);
  const replay = await verify("verif@exemple.invalid", "424242");
  assert.match(errorText(replay), /Code invalide ou expiré/);
  assert.equal(db.establishments, 1);
});

test("inscription (lot E) : le mode choisi est conservé dans la demande, converti, puis appliqué à l'espace créé", async () => {
  resetState();
  establishmentCreates.length = 0;
  const email = uniq("mode-");
  const form = registrationForm(email);
  form.set("activityMode", "HOTEL");
  await registration.registerEstablishment(undefined as never, form);
  assert.equal(db.otp[0]!.businessMode, "HOTEL"); // le choix de l'interface est conservé dans la demande

  const code = db.otp[0]!.code;
  const ok = await verify(email, code);
  assert.equal(ok?.success, true);
  assert.equal(establishmentCreates[0]!.businessMode, "HOTEL"); // lu dans la demande, pas du navigateur
});

test("inscription : l'agence immobilière est suspendue — refusée côté serveur, même forgée, aucune demande créée", async () => {
  resetState();
  const form = registrationForm(uniq("agence-"));
  form.set("activityMode", "AGENCY");
  const refused = await registration.registerEstablishment(undefined as never, form);
  assert.equal(db.otp.length, 0, "aucun code ne doit être émis");
  assert.ok(refused && "errors" in refused && refused.errors?.activityMode, "erreur sur le type d'établissement");
  assert.equal(db.establishments, 0);
});

test("inscription (lot E) : mode absent ou inconnu → refusé ou Résidence ; jamais de valeur hors liste", async () => {
  resetState();
  const email = uniq("mode-defaut-");
  await registration.registerEstablishment(undefined as never, registrationForm(email)); // aucun activityMode
  assert.equal(db.otp[0]!.businessMode, "RESIDENCE");

  resetState();
  const bad = registrationForm(uniq("mode-faux-"));
  bad.set("activityMode", "ADMIN");
  const refused = await registration.registerEstablishment(undefined as never, bad);
  assert.equal(db.otp.length, 0);
  assert.ok(refused && "errors" in refused && refused.errors);
});

test("inscription : émission d'un code sans Math.random, 6 chiffres, valable 15 min", async () => {
  resetState();
  const email = uniq("inscription-");
  const original = Math.random;
  Math.random = () => {
    throw new Error("Math.random interdit pour les OTP");
  };
  try {
    const result = await registration.registerEstablishment(undefined as never, registrationForm(email));
    assert.equal(result && "requiresOtp" in result && result.requiresOtp, true);
  } finally {
    Math.random = original;
  }
  assert.equal(db.otp.length, 1);
  assert.match(db.otp[0]!.code, /^[1-9][0-9]{5}$/);
  const minutes = (db.otp[0]!.expiresAt.getTime() - Date.now()) / 60_000;
  assert.ok(minutes > 14.9 && minutes <= 15);
});

test("renvoi : le code est REMPLACÉ et le compteur remis à zéro dans UNE seule instruction ; l'ancien code ne vaut plus rien", async () => {
  resetState();
  const row = seedOtp({ attempts: 3 });
  const oldCode = row.code;
  const result = await registration.resendOtpCode("verif@exemple.invalid");
  assert.equal(result.success, true);
  assert.notEqual(row.code, oldCode, "code remplacé");
  assert.match(row.code, /^[1-9][0-9]{5}$/);
  assert.equal(row.attempts, 0);
  assert.equal(db.events.filter((e) => e === "otp.updateMany").length, 1, "remplacement unique et atomique");
  assert.ok(!db.events.includes("otp.update"));

  const withOld = await verify("verif@exemple.invalid", oldCode);
  assert.match(errorText(withOld), /Code invalide ou expiré/);
  assert.equal(row.attempts, 1);
  const withNew = await verify("verif@exemple.invalid", row.code);
  assert.equal(withNew?.success, true);
});

test("renvoi : e-mail non envoyé → ancien code ET ancien compteur conservés (rien n'est remis à zéro)", async () => {
  resetState();
  const row = seedOtp({ attempts: 3 });
  const before = row.code;
  mailSucceeds = false;
  const result = await registration.resendOtpCode("verif@exemple.invalid");
  assert.deepEqual(result, { success: true, message: GENERIC_RESEND }, "réponse générique, sans oracle");
  assert.equal(row.code, before);
  assert.equal(row.attempts, 3);
});

test("renvoi : demande consommée entre la lecture et le remplacement → échec propre, rien n'est recréé", async () => {
  resetState();
  seedOtp();
  afterOtpFind = () => {
    db.otp = [];
  };
  const result = await registration.resendOtpCode("verif@exemple.invalid");
  assert.deepEqual(result, { success: true, message: GENERIC_RESEND });
  assert.equal(db.otp.length, 0);
});

test("renvoi : argument non textuel (objet filtre, nombre, tableau, vide) → refusé avant tout accès à la base", async () => {
  resetState();
  for (const value of [{ not: "" }, 12345, ["a@b.c"], null, undefined, "   "] as unknown[]) {
    freshIp();
    const result = await registration.resendOtpCode(value as string);
    assert.deepEqual(result, { success: true, message: GENERIC_RESEND });
  }
  assert.equal(db.otpFindCalls, 0);
  assert.equal(db.mails, 0);
});

test("renvoi : plafond par adresse (5 / 15 min, casse et espaces normalisés) depuis des IP différentes", async () => {
  resetState();
  const email = uniq("renvoi-");
  seedOtp({ email });
  for (let i = 0; i < 5; i += 1) {
    freshIp();
    const r = await registration.resendOtpCode(i % 2 ? ` ${email.toUpperCase()} ` : email);
    if (i % 2 === 0) assert.equal(r.success, true);
  }
  freshIp();
  const mailsBefore = db.mails;
  const blocked = await registration.resendOtpCode(email);
  assert.equal(blocked.success, false);
  assert.match(String(blocked.message), /patienter/);
  assert.equal(db.mails, mailsBefore, "aucun e-mail une fois la limite atteinte");
});

test("renvoi : plafond par IP conservé (3 / 5 min)", async () => {
  resetState();
  const email = uniq("renvoi-ip-");
  seedOtp({ email });
  for (let i = 0; i < 3; i += 1) await registration.resendOtpCode(email);
  const mailsBefore = db.mails;
  const blocked = await registration.resendOtpCode(email);
  assert.equal(blocked.success, false);
  assert.equal(db.mails, mailsBefore);
});

// =============================================================================================
// D. Étape 2c-2 — messages et comportements NEUTRES (aucune déduction d'existence de compte)
// =============================================================================================

const shape = (value: unknown, typed: string) => JSON.parse(JSON.stringify(value ?? null).split(typed).join("<SAISIE>")) as unknown;
const register = (email: string) => registration.registerEstablishment(undefined as never, registrationForm(email));
const existingUser = (email: string): UserRow => ({ id: "u9", email, name: "Titulaire", username: email, establishmentId: "e9" });

test("inscription (D1) : MÊME réponse publique pour une adresse libre et une adresse déjà inscrite", async () => {
  resetState();
  const free = uniq("libre-");
  const used = uniq("deja-");
  const a = await register(free);
  freshIp();
  userForLookup = existingUser(used);
  const b = await register(used);
  assert.deepEqual(shape(a, free), shape(b, used));
  assert.deepEqual(Object.keys(b ?? {}).sort(), ["email", "plan", "requiresOtp", "success"]);
  assert.doesNotMatch(JSON.stringify(b), /existe|déjà|compte|accountNotFound/i);
});

test("inscription (D1) : adresse déjà inscrite → e-mail informatif SANS code, aucun OTP ni compte ; adresse libre → OTP", async () => {
  resetState();
  const used = uniq("deja-");
  userForLookup = existingUser(used);
  await register(used);
  assert.equal(db.otp.length, 0, "aucun OTP pour une adresse déjà inscrite");
  assert.equal(db.users + db.establishments, 0);
  assert.equal(db.infoMails, 1);
  assert.deepEqual(db.infoMailTo, [used]);
  assert.equal(db.mails, 0, "aucun e-mail de code OTP");

  resetState();
  await register(uniq("libre-"));
  assert.equal(db.otp.length, 1);
  assert.equal(db.mails, 1);
  assert.equal(db.infoMails, 0);
});

test("inscription (D1) : le hachage est exécuté une fois dans les DEUX branches", async () => {
  resetState();
  await register(uniq("libre-"));
  assert.equal(db.hashCalls, 1);
  resetState();
  const used = uniq("deja-");
  userForLookup = existingUser(used);
  await register(used);
  assert.equal(db.hashCalls, 1);
});

test("inscription (D1/D5) : échec OU exception d'envoi → MÊME message public dans les deux branches, sans OTP exposé", async () => {
  for (const mode of ["échec", "exception"] as const) {
    resetState();
    mailSucceeds = mode !== "échec";
    mailThrows = mode === "exception";
    const free = uniq("libre-");
    const used = uniq("deja-");
    const a = await register(free);
    const afterFree = db.otp.length;
    freshIp();
    userForLookup = existingUser(used);
    const b = await register(used);
    assert.deepEqual(shape(a, free), shape(b, used), mode);
    assert.ok(a && "message" in a && a.message, mode);
    assert.ok(!(a && "requiresOtp" in a), mode);
    if (mode === "échec") assert.equal(afterFree, 0, "demande annulée quand l'e-mail ne part pas");
    assert.doesNotMatch(JSON.stringify([a, b]), /\b\d{6}\b|existe|déjà/i);
  }
});

test("inscription et renvoi (D7) : plafond de 5 émissions / 15 min PARTAGÉ par adresse, identique adresse libre ou inscrite", async () => {
  const limitMessages: string[] = [];
  for (const exists of [false, true]) {
    resetState();
    const email = uniq(exists ? "cap-deja-" : "cap-libre-");
    if (exists) userForLookup = existingUser(email);
    for (let i = 0; i < 3; i += 1) {
      freshIp();
      await register(email);
    }
    for (let i = 0; i < 2; i += 1) {
      freshIp();
      await registration.resendOtpCode(email);
    }
    // 3 inscriptions + 2 renvois = 5 émissions : la 6e est refusée, quel que soit le parcours.
    freshIp();
    const sent = db.mails + db.infoMails;
    const sixth = await register(email);
    assert.match(String(sixth && "message" in sixth ? sixth.message : ""), /Trop de tentatives d'inscription pour cette adresse/);
    assert.equal(db.mails + db.infoMails, sent, "aucun e-mail une fois le plafond atteint");
    freshIp();
    const resend = await registration.resendOtpCode(email);
    assert.equal(resend.success, false);
    limitMessages.push(String(sixth && "message" in sixth ? sixth.message : ""));
  }
  assert.equal(limitMessages[0], limitMessages[1], "même message que l'adresse soit libre ou déjà inscrite");
});

test("parcours Google (D8) : comportement explicite conservé ; le plafond d'émissions n'est pas consommé", async () => {
  resetState();
  const email = uniq("google-");
  googleCookie = await sessionToken.signGoogleAuthToken({ email, purpose: "register" });
  const ok = await register(email);
  assert.equal(ok && "googleRegistered" in ok && ok.googleRegistered, true);
  assert.equal(db.establishments, 1);

  // Adresse déjà inscrite + jeton Google valide pour cette adresse : message explicite (adresse prouvée).
  freshIp();
  userForLookup = existingUser(email);
  const dup = await register(email);
  assert.match(errorText(dup), /existe déjà/);

  // Jeton Google d'une AUTRE adresse + adresse inscrite : réponse neutre, pas d'aveu d'existence.
  freshIp();
  googleCookie = await sessionToken.signGoogleAuthToken({ email: uniq("autre-"), purpose: "register" });
  const neutral = await register(email);
  assert.equal(neutral && "requiresOtp" in neutral && neutral.requiresOtp, true);
  assert.doesNotMatch(errorText(neutral), /existe/);

  // 5 inscriptions Google sur une adresse n'entament pas le plafond d'émissions de code.
  resetState();
  const other = uniq("google-plafond-");
  googleCookie = await sessionToken.signGoogleAuthToken({ email: other, purpose: "register" });
  for (let i = 0; i < 5; i += 1) {
    freshIp();
    const r = await register(other);
    assert.equal(r && "googleRegistered" in r && r.googleRegistered, true);
  }
  googleCookie = undefined;
  freshIp();
  const afterGoogle = await register(other);
  assert.equal(afterGoogle && "requiresOtp" in afterGoogle && afterGoogle.requiresOtp, true);
});

test("réinitialisation (D2) : MÊME réponse publique pour tous les états de compte et d'envoi", async () => {
  type Scenario = { name: string; setup: (typed: string) => void; typed?: string; tokens: number; mails: number };
  const asUser = (typed: string): UserRow => ({ id: "u1", email: typed.includes("@") ? typed : "titulaire@exemple.invalid", name: "Test", username: "t", establishmentId: null });
  const scenarios: Scenario[] = [
    { name: "compte existant avec e-mail", setup: (t) => void (userForLookup = asUser(t)), tokens: 1, mails: 1 },
    { name: "compte existant via identifiant", typed: "mon_identifiant_demande", setup: (t) => void (userForLookup = asUser(t)), tokens: 1, mails: 1 },
    { name: "identifiant inconnu", setup: () => void (userForLookup = null), tokens: 0, mails: 0 },
    {
      name: "compte sans e-mail exploitable",
      typed: "sans-adresse-mail",
      setup: () => void (userForLookup = { id: "u2", email: null, name: "Test", username: "sans-adresse-mail", establishmentId: null }),
      tokens: 0,
      mails: 0,
    },
    { name: "échec d'envoi", setup: (t) => ((userForLookup = asUser(t)), (mailSucceeds = false)), tokens: 1, mails: 1 },
    { name: "exception d'envoi", setup: (t) => ((userForLookup = asUser(t)), (mailThrows = true)), tokens: 1, mails: 1 },
    { name: "écriture du jeton impossible", setup: (t) => ((userForLookup = asUser(t)), (tokenCreateFails = true)), tokens: 0, mails: 0 },
  ];
  for (const s of scenarios) {
    resetState();
    const typed = s.typed ?? uniq("reset-");
    s.setup(typed);
    const fd = new FormData();
    fd.set("identifier", typed);
    const result = await reset.requestPasswordReset(undefined, fd);
    assert.deepEqual(result, { step: "CODE", email: typed, message: GENERIC_RESET }, s.name);
    assert.deepEqual(Object.keys(result).sort(), ["email", "message", "step"], s.name);
    assert.equal(db.tokens.length, s.tokens, `${s.name} : jetons`);
    assert.equal(db.mails, s.mails, `${s.name} : e-mails`);
    assert.doesNotMatch(JSON.stringify(result), /accountNotFound|maskedEmail|\*\*\*|exemple\.invalid.*exemple\.invalid/i, s.name);
  }
});

test("réinitialisation (D3) : MÊME erreur pour jeton absent, expiré, code faux, code épuisé et compte supprimé", async () => {
  const past = () => new Date(Date.now() - 1000);
  const cases: Array<{ name: string; code: string; setup: () => void }> = [
    { name: "jeton absent", code: "424242", setup: () => void (tokenEmail = uniq("absent-")) },
    { name: "code expiré", code: "424242", setup: () => void seedToken({ expiresAt: past() }) },
    { name: "code faux", code: "111111", setup: () => void seedToken({ code: "999999" }) },
    { name: "code épuisé", code: "424242", setup: () => void seedToken({ attempts: 5 }) },
    {
      name: "compte supprimé",
      code: "424242",
      setup: () => {
        seedToken();
        userForLookup = null;
      },
    },
  ];
  for (const c of cases) {
    resetState();
    c.setup();
    const result = await confirm(c.code);
    assert.deepEqual(result, { step: "CODE", email: tokenEmail, error: GENERIC_CODE }, c.name);
    assert.equal(db.passwordUpdates, 0, c.name);
  }
});

test("inscription (D3) : MÊME erreur pour demande absente, expirée, code faux et code épuisé", async () => {
  const cases: Array<{ name: string; code: string; setup: () => void }> = [
    { name: "demande absente", code: "424242", setup: () => undefined },
    { name: "code expiré", code: "424242", setup: () => void seedOtp({ expiresAt: new Date(Date.now() - 1000) }) },
    { name: "code faux", code: "111111", setup: () => void seedOtp() },
    { name: "code épuisé", code: "424242", setup: () => void seedOtp({ attempts: 5 }) },
  ];
  for (const c of cases) {
    resetState();
    c.setup();
    const result = await verify("verif@exemple.invalid", c.code);
    assert.deepEqual(result, { errors: { code: [GENERIC_CODE] } }, c.name);
    assert.equal(db.establishments + db.users, 0, c.name);
  }
});

test("renvoi (D4) : MÊME réponse publique pour demande absente, en cours, échec et exception d'envoi, demande consommée", async () => {
  const cases: Array<{ name: string; setup: (email: string) => void }> = [
    { name: "aucune demande", setup: () => undefined },
    { name: "demande en cours", setup: (e) => void seedOtp({ email: e }) },
    { name: "échec d'envoi", setup: (e) => ((mailSucceeds = false), void seedOtp({ email: e })) },
    { name: "exception d'envoi", setup: (e) => ((mailThrows = true), void seedOtp({ email: e })) },
    { name: "demande consommée en cours de route", setup: (e) => ((afterOtpFind = () => void (db.otp = [])), void seedOtp({ email: e })) },
  ];
  for (const c of cases) {
    resetState();
    const email = uniq("renvoi-uniforme-");
    c.setup(email);
    const result = await registration.resendOtpCode(email);
    assert.deepEqual(result, { success: true, message: GENERIC_RESEND }, c.name);
  }
});

// --- Gardes de source -------------------------------------------------------------------------

const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("garde de source : plus aucun message d'existence de compte dans les actions", () => {
  const forgot = strip(read("app/actions/forgot-password.ts"));
  for (const re of [/n'existe pas/, /introuvable/i, /maskEmail/, /maskedEmail/, /Aucune demande/, /Il vous reste/, /Ce compte/]) {
    assert.doesNotMatch(forgot, re, String(re));
  }
  // L'ancien indicateur n'existe plus que sous la forme `accountNotFound?: never` (jamais affectable).
  const indicators = forgot.match(/accountNotFound[^;\n]*/g) ?? [];
  assert.deepEqual(indicators, ["accountNotFound?: never"]);
  const reg = strip(read("app/actions/establishment-registration.ts"));
  for (const re of [/Aucune demande/, /Aucune inscription en cours/, /Code de vérification incorrect/, /Trop de codes erronés/, /a expiré/]) {
    assert.doesNotMatch(reg, re, String(re));
  }
  // « existe déjà » : un seul littéral (constante réservée au parcours Google et au conflit en transaction).
  assert.equal((reg.match(/existe déjà/g) ?? []).length, 1);
  assert.match(reg, /existingUser && isGoogleVerified/);
});

test("garde de source : interfaces sans état « compte introuvable / identifié », sans adresse issue du compte", () => {
  const forgotUi = strip(read("app/forgot-password/forgot-password-form.tsx"));
  const registerUi = strip(read("app/register/register-form.tsx"));
  for (const re of [/maskedEmail/, /accountNotFound/, /Adresse e-mail introuvable/, /Compte identifié/]) {
    assert.doesNotMatch(forgotUi, re, String(re));
    assert.doesNotMatch(registerUi, re, String(re));
  }
  assert.match(forgotUi, /Pas de message \?/);
  assert.match(forgotUi, /Créer un compte SAMA HOME/);
  assert.match(forgotUi, /Modifier l&apos;adresse/);
  assert.match(registerUi, /Pas de message \?/);
  assert.match(registerUi, /Modifier l&apos;adresse/);
  assert.match(registerUi, /Adresse saisie/);
  assert.doesNotMatch(registerUi, /Nouveau code envoyé avec succès/);
  assert.doesNotMatch(registerUi, /Nous avons envoyé un code/);
});

test("garde de source : l'e-mail informatif ne contient aucun code et n'écrit aucune journalisation", () => {
  const src = read("lib/mail.ts");
  const block = src.slice(src.indexOf("export async function sendAccountExistsEmail"), src.indexOf("export async function sendPasswordResetEmail"));
  assert.match(block, /Tentative d'inscription avec votre adresse – SAMA HOME/);
  assert.match(block, /Une inscription a été demandée avec cette adresse, mais un compte SAMA HOME existe déjà\. Si c'était vous, connectez-vous ou réinitialisez votre mot de passe depuis la page de connexion\. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message\./);
  assert.doesNotMatch(block, /\bcode\b/i);
  assert.doesNotMatch(block, /console\./);
});

// =============================================================================================
// E. Correction de confidentialité : saisie par IDENTIFIANT à la confirmation de réinitialisation
//    → `email` dans la réponse = la saisie, jamais l'adresse récupérée dans le compte.
// =============================================================================================

const typedUsername = () => {
  seq += 1;
  return `identifiant_${seq}`; // sans « @ » : déclenche la résolution identifiant → adresse
};
const mismatchForm = (typed: string) => {
  const fd = confirmForm("424242", typed, "TEST_ONLY_NEW_PASSWORD");
  fd.set("confirmPassword", "Autre-valeur-456!");
  return fd;
};

test("confirmation par identifiant : réponse identique compte existant / inconnu, aucune adresse issue de la base", async () => {
  type Scenario = { name: string; seed?: Partial<TokenRow>; run: (typed: string) => Promise<unknown> };
  const scenarios: Scenario[] = [
    { name: "code faux", seed: {}, run: (t) => confirm("111111", t) },
    { name: "code correct (compte existant) / jeton absent (inconnu)", seed: { code: "999999" }, run: (t) => confirm("424242", t) },
    { name: "code expiré / absent", seed: { expiresAt: new Date(Date.now() - 1000) }, run: (t) => confirm("424242", t) },
    { name: "code épuisé / absent", seed: { attempts: 5 }, run: (t) => confirm("424242", t) },
    { name: "code mal formé", seed: {}, run: (t) => confirm("12ab56", t) },
    { name: "mot de passe trop court", seed: {}, run: (t) => reset.confirmPasswordReset(undefined, confirmForm("424242", t, "court")) },
    { name: "mots de passe différents", seed: {}, run: (t) => reset.confirmPasswordReset(undefined, mismatchForm(t)) },
  ];
  for (const s of scenarios) {
    // Compte EXISTANT, saisi par identifiant : l'adresse du compte est distincte de la saisie.
    resetState();
    const accountEmail = uniq("adresse-du-compte-");
    seedToken({ ...s.seed, email: accountEmail });
    const existingTyped = typedUsername();
    const existing = await s.run(existingTyped);

    // Identifiant INCONNU.
    resetState();
    const unknownTyped = typedUsername();
    const unknown = await s.run(unknownTyped);

    assert.deepEqual(shape(existing, existingTyped), shape(unknown, unknownTyped), s.name);
    assert.equal((existing as { email?: string }).email, existingTyped, `${s.name} : email = saisie`);
    assert.equal((unknown as { email?: string }).email, unknownTyped, `${s.name} : email = saisie`);
    assert.ok(!JSON.stringify(existing).includes(accountEmail), `${s.name} : l'adresse du compte fuit`);
    assert.doesNotMatch(JSON.stringify(existing), /@/, `${s.name} : aucune adresse e-mail dans la réponse`);
  }
});

test("confirmation par identifiant : limites IP et adresse → la réponse ne renvoie que la saisie", async () => {
  // Plafond par adresse résolue (10 / 15 min) : l'adresse du compte sert de clé, jamais de réponse.
  resetState();
  const accountEmail = uniq("adresse-plafond-");
  seedToken({ email: accountEmail });
  const typed = typedUsername();
  let last: unknown;
  for (let i = 0; i < 11; i += 1) {
    freshIp();
    last = await confirm("111111", typed);
  }
  assert.match(errorText(last), /Trop de tentatives de validation/);
  assert.equal((last as { email?: string }).email, typed);
  assert.ok(!JSON.stringify(last).includes(accountEmail));

  // Plafond par IP (15 / 15 min).
  resetState();
  const accountEmail2 = uniq("adresse-ip-");
  seedToken({ email: accountEmail2 });
  const typed2 = typedUsername();
  let last2: unknown;
  for (let i = 0; i < 16; i += 1) last2 = await confirm("111111", typed2);
  assert.match(errorText(last2), /Trop de tentatives de validation/);
  assert.equal((last2 as { email?: string }).email, typed2);
  assert.ok(!JSON.stringify(last2).includes(accountEmail2));
});

test("confirmation par identifiant : succès → mot de passe changé, aucune adresse dans la réponse ; protections 2c-1 intactes", async () => {
  resetState();
  const accountEmail = uniq("adresse-succes-");
  seedToken({ email: accountEmail });
  const typed = typedUsername();
  const ok = await confirm("424242", typed);
  assert.equal(ok?.step, "SUCCESS");
  assert.ok(!JSON.stringify(ok).includes(accountEmail));
  assert.equal(db.passwordUpdates, 1);
  assert.equal(db.tokens.length, 0, "jeton consommé (usage unique)");
  const replay = await confirm("424242", typed);
  assert.deepEqual(replay, { step: "CODE", email: typed, error: GENERIC_CODE });
  assert.equal(db.passwordUpdates, 1);

  // Réservation atomique conservée : 40 requêtes parallèles avec des codes faux, saisie par identifiant.
  resetState();
  rateBypass = true;
  const accountEmail2 = uniq("adresse-parallele-");
  seedToken({ email: accountEmail2 });
  const typed2 = typedUsername();
  readGate = makeBarrier(40);
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => confirm(String(100000 + i), typed2)));
  readGate = null;
  assert.equal(db.tokenClaims, 5);
  assert.ok(db.maxTokenAttempts <= 5);
  for (const r of results) assert.ok(!JSON.stringify(r).includes(accountEmail2));
});

test("garde de source : aucune réponse de forgot-password.ts ne renvoie l'adresse résolue (`email` interne)", () => {
  const forgot = strip(read("app/actions/forgot-password.ts"));
  assert.doesNotMatch(forgot, /^\s*email,\s*$/m, "propriété `email,` raccourcie dans une réponse");
  assert.doesNotMatch(forgot, /\{\s*step:\s*"[A-Z]+",\s*email\s*[,}]/, "réponse en ligne avec `email` interne");
  assert.match(forgot, /const typedEmail = rawEmail;/);
  // Toute propriété `email:` d'une réponse vaut la saisie (typedEmail / rawEmail / rawIdentifier).
  const responseEmails = [...forgot.matchAll(/^\s*(?:return\s*\{[^}]*?)?\bemail:\s*([A-Za-z_]+)/gm)].map((m) => m[1]);
  for (const value of responseEmails) assert.ok(["typedEmail", "rawEmail", "rawIdentifier", "true", "equals", "targetEmail"].includes(value), `email: ${value}`);
});
