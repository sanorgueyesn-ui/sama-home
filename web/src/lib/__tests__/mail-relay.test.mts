// Tests de src/lib/mail.ts : plus de relais codé en dur, échec explicite sans configuration,
// code OTP masqué dans les journaux hors local.
//
// Isolation : `fetch` est remplacé par une doublure (aucun appel réseau possible) ; SMTP n'est
// jamais atteint (aucun SMTP_PASS n'est défini dans ces tests). Aucun e-mail n'est envoyé.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

type Env = Record<string, string | undefined>;
const env = process.env as Env;

const { sendOtpEmail, sendAccountExistsEmail } = await import("../mail");

const realFetch = globalThis.fetch;
let fetchCalls: string[] = [];

function stubFetch(responder: (url: string) => { ok: boolean; body: string }) {
  fetchCalls = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    fetchCalls.push(url);
    const { ok, body } = responder(url);
    return { ok, text: async () => body } as Response;
  }) as typeof fetch;
}

function setEnv(values: Env) {
  for (const key of ["GMAIL_RELAY_URL", "GMAIL_RELAY_SECRET", "SMTP_USER", "SMTP_PASS", "SMTP_HOST", "SAMA_ENV", "NODE_ENV", "SAMA_EXPECTED_DB"]) {
    delete env[key];
  }
  Object.assign(env, values);
}

async function quietly<T>(fn: () => Promise<T>): Promise<{ result: T; logs: string }> {
  const lines: string[] = [];
  const originals = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a: unknown[]) => void lines.push(a.join(" "));
  console.warn = (...a: unknown[]) => void lines.push(a.join(" "));
  console.error = (...a: unknown[]) => void lines.push(a.join(" "));
  try {
    return { result: await fn(), logs: lines.join("\n") };
  } finally {
    Object.assign(console, originals);
  }
}

const params = { to: "destinataire@exemple.invalid", code: "987654", establishmentName: "Résidence Test" };

test.afterEach(() => {
  globalThis.fetch = realFetch;
});

test("aucune URL de relais n'est codée en dur dans les sources", () => {
  const source = fs.readFileSync(new URL("../mail.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /script\.google\.com/);
  assert.doesNotMatch(source, /macros\/s\//);
});

test("sans GMAIL_RELAY_URL ni SMTP : échec explicite, aucun appel réseau", async () => {
  setEnv({ NODE_ENV: "production" });
  stubFetch(() => {
    throw new Error("fetch ne doit pas être appelé");
  });
  const { result } = await quietly(() => sendOtpEmail(params));
  assert.equal(result.success, false);
  assert.equal(result.error, "MAIL_NOT_CONFIGURED");
  assert.deepEqual(fetchCalls, []);
});

test("relais configuré explicitement : utilisé, succès signalé", async () => {
  setEnv({ NODE_ENV: "production", GMAIL_RELAY_URL: "https://relais.exemple.invalid/envoi" });
  stubFetch(() => ({ ok: true, body: '{"success":true}' }));
  const { result } = await quietly(() => sendOtpEmail(params));
  assert.equal(result.success, true);
  assert.deepEqual(fetchCalls, ["https://relais.exemple.invalid/envoi"]);
});

test("un échec explicite du relais (HTTP 200, success:false) n'est jamais compté comme un envoi réussi", async () => {
  setEnv({ NODE_ENV: "production", GMAIL_RELAY_URL: "https://relais.exemple.invalid/envoi" });
  stubFetch(() => ({ ok: true, body: '{"success":false,"error":"quota"}' }));
  const { result } = await quietly(() => sendOtpEmail(params));
  assert.equal(result.success, false);
  assert.equal(result.simulated, true);
});

test("relais configuré mais injoignable, sans SMTP : échec, pas de secours codé en dur", async () => {
  setEnv({ NODE_ENV: "production", GMAIL_RELAY_URL: "https://relais.exemple.invalid/envoi" });
  stubFetch(() => {
    throw new Error("connexion refusée");
  });
  const { result } = await quietly(() => sendOtpEmail(params));
  assert.equal(result.success, false);
  assert.deepEqual(fetchCalls, ["https://relais.exemple.invalid/envoi"]);
});

test("journaux : le code OTP est masqué hors local explicitement autorisé", async () => {
  setEnv({ NODE_ENV: "production" });
  stubFetch(() => ({ ok: true, body: '{"success":true}' }));
  const { logs } = await quietly(() => sendOtpEmail(params));
  assert.ok(!logs.includes(params.code), "le code apparaît dans les journaux");
  assert.match(logs, /<masqué>/);
});

test("e-mail informatif (adresse déjà inscrite) : objet et corps conformes, AUCUN code, aucune journalisation propre", async () => {
  setEnv({ NODE_ENV: "production", GMAIL_RELAY_URL: "https://relais.exemple.invalid/envoi" });
  let sent: { to?: string; subject?: string; text?: string; html?: string } = {};
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    sent = JSON.parse(String(init?.body));
    return { ok: true, text: async () => '{"success":true}' } as Response;
  }) as typeof fetch;
  const { result, logs } = await quietly(() => sendAccountExistsEmail({ to: "titulaire@exemple.invalid" }));
  assert.equal(result.success, true);
  assert.equal(sent.to, "titulaire@exemple.invalid");
  assert.equal(sent.subject, "Tentative d'inscription avec votre adresse – SAMA HOME");
  assert.equal(
    sent.text,
    "Une inscription a été demandée avec cette adresse, mais un compte SAMA HOME existe déjà. Si c'était vous, connectez-vous ou réinitialisez votre mot de passe depuis la page de connexion. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  );
  // Le bloc <style> contient des couleurs CSS à 6 chiffres (#475569) : on ne contrôle que le contenu lisible.
  const readable = `${sent.subject} ${sent.text} ${String(sent.html).replace(/<style[\s\S]*?<\/style>/g, "")}`;
  assert.doesNotMatch(readable, /\b\d{6}\b/, "aucun code à 6 chiffres");
  assert.doesNotMatch(logs, /Destinataire :|CODE OTP/, "la fonction n'écrit pas son propre bloc de journal avec le destinataire");
});

test("journaux : le code OTP reste visible en local explicitement autorisé (parcours de test)", async () => {
  setEnv({
    SAMA_ENV: "local",
    NODE_ENV: "development",
    SAMA_EXPECTED_DB: "samahome_local_v17",
  });
  env.DATABASE_URL = "postgresql://u:p@127.0.0.1:55417/samahome_local_v17";
  stubFetch(() => {
    throw new Error("relais non configuré : ne doit pas être appelé");
  });
  const { logs } = await quietly(() => sendOtpEmail(params));
  assert.ok(logs.includes(params.code));
});
