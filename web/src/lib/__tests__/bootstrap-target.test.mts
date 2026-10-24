// Tests de evaluateBootstrapTarget (cible du bootstrap de l'administrateur de plateforme).
// Module PUR : aucune connexion, aucun réseau ; toutes les valeurs sont FICTIVES
// (hôtes réservés `.invalid`). Les refus sont donc vérifiés par construction : la
// fonction ne dispose d'aucun moyen de se connecter.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBootstrapTarget } from "../env-guard";

const LOCAL_URL = "postgresql://u:p@127.0.0.1:55417/samahome_local_v17";
const REMOTE_URL = "postgresql://u:p@db.exemple-distant.invalid:5432/x";

const localEnv = {
  SAMA_ENV: "local",
  NODE_ENV: "development",
  DATABASE_URL: LOCAL_URL,
  DIRECT_URL: LOCAL_URL,
  SAMA_EXPECTED_DB: "samahome_local_v17",
};

const prodEnv = {
  DATABASE_URL: REMOTE_URL,
  SAMA_DEPLOY_TARGET_HOST: "db.exemple-distant.invalid",
};

// ------------------------------------------------------------------ mode local
test("local : vérification seule autorisée sans --target-host", () => {
  const v = evaluateBootstrapTarget([], localEnv);
  assert.deepEqual(v, { ok: true, mode: "local", hostPort: "127.0.0.1:55417" });
});

test("local : --write exige --target-host égal à l'hôte local", () => {
  assert.equal(evaluateBootstrapTarget(["--write"], localEnv).ok, false);
  assert.equal(evaluateBootstrapTarget(["--write", "--target-host=autre.exemple.invalid"], localEnv).ok, false);
  const ok = evaluateBootstrapTarget(["--write", "--target-host=127.0.0.1"], localEnv);
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.mode, "local");
});

test("local : une cible distante est refusée, même avec --write et --target-host exacts", () => {
  const env = { ...localEnv, DATABASE_URL: REMOTE_URL, DIRECT_URL: undefined };
  assert.equal(evaluateBootstrapTarget([], env).ok, false);
  assert.equal(evaluateBootstrapTarget(["--write", "--target-host=db.exemple-distant.invalid"], env).ok, false);
});

test("local : --target-host seul ne suffit jamais à autoriser une écriture distante", () => {
  const env = { DATABASE_URL: REMOTE_URL };
  assert.equal(evaluateBootstrapTarget(["--write", "--target-host=db.exemple-distant.invalid"], env).ok, false);
  assert.equal(evaluateBootstrapTarget(["--target-host=db.exemple-distant.invalid"], env).ok, false);
});

test("local : SAMA_ENV, base attendue, redirection d'URL, DIRECT_URL et NODE_ENV=production refusés", () => {
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, SAMA_ENV: undefined }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, SAMA_EXPECTED_DB: "autre_base" }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, SAMA_EXPECTED_DB: undefined }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, DATABASE_URL: `${LOCAL_URL}?host=db.exemple.invalid` }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, DIRECT_URL: REMOTE_URL }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, NODE_ENV: "production" }).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, DATABASE_URL: undefined }).ok, false);
});

test("local : configuration absente ou illisible → refus", () => {
  assert.equal(evaluateBootstrapTarget([], {}).ok, false);
  assert.equal(evaluateBootstrapTarget([], { ...localEnv, DATABASE_URL: "pas une url" }).ok, false);
});

// ------------------------------------------------------------- mode production
test("production : jamais par défaut (cible distante sans --production → refus)", () => {
  assert.equal(evaluateBootstrapTarget([], prodEnv).ok, false);
  assert.equal(evaluateBootstrapTarget(["--write", "--target-host=db.exemple-distant.invalid"], prodEnv).ok, false);
});

test("production : --production seul ne suffit pas (hôte attendu absent de l'environnement)", () => {
  assert.equal(evaluateBootstrapTarget(["--production"], { DATABASE_URL: REMOTE_URL }).ok, false);
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=db.exemple-distant.invalid"], { DATABASE_URL: REMOTE_URL }).ok,
    false,
    "le drapeau --target-host ne peut pas servir de confirmation d'environnement",
  );
});

test("production : --production + SAMA_DEPLOY_TARGET_HOST sans --target-host → refus", () => {
  assert.equal(evaluateBootstrapTarget(["--production"], prodEnv).ok, false);
  assert.equal(evaluateBootstrapTarget(["--production", "--write"], prodEnv).ok, false);
});

test("production : les trois confirmations concordantes → autorisé", () => {
  const v = evaluateBootstrapTarget(["--production", "--write", "--target-host=db.exemple-distant.invalid"], prodEnv);
  assert.deepEqual(v, { ok: true, mode: "production", hostPort: "db.exemple-distant.invalid:5432" });
  assert.equal(evaluateBootstrapTarget(["--production", "--target-host=db.exemple-distant.invalid"], prodEnv).ok, true);
});

test("production : hôte discordant, SAMA_ENV=local, cible locale ou redirection d'URL → refus", () => {
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=autre.exemple.invalid"], prodEnv).ok,
    false,
  );
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=db.exemple-distant.invalid"], { ...prodEnv, SAMA_DEPLOY_TARGET_HOST: "autre.exemple.invalid" }).ok,
    false,
  );
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=db.exemple-distant.invalid"], { ...prodEnv, SAMA_ENV: "local" }).ok,
    false,
  );
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=127.0.0.1"], { DATABASE_URL: LOCAL_URL, SAMA_DEPLOY_TARGET_HOST: "127.0.0.1" }).ok,
    false,
  );
  assert.equal(
    evaluateBootstrapTarget(["--production", "--target-host=db.exemple-distant.invalid"], { ...prodEnv, DATABASE_URL: `${REMOTE_URL}?host=autre.exemple.invalid` }).ok,
    false,
  );
});
