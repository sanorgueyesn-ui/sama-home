// Tests de la garde contre la production (src/lib/env-guard.ts).
// Module PUR : aucun import applicatif, aucune connexion, aucun accès réseau ;
// toutes les valeurs ci-dessous sont FICTIVES (hôtes réservés à la
// documentation / invalides). Le refus est vérifié par construction : la
// garde ne dispose d'aucun moyen de se connecter.
import test from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import {
  assertDeployTarget,
  assertLocalObjectStorage,
  assertSafeDevelopmentTarget,
  evaluateDatabaseUrl,
  evaluateDeployTarget,
  evaluateEnvironment,
  evaluateObjectStorageEndpoint,
  isValidTestMarker,
  TEST_DB_MARKER,
  UnsafeTargetError,
} from "../env-guard";

const LOCAL_OK = "postgresql://user:pass@127.0.0.1:55417/anything";
const okEnv = { SAMA_ENV: "local", NODE_ENV: "development", DATABASE_URL: LOCAL_OK, SAMA_EXPECTED_DB: "anything" };

test("cible locale autorisée (hôte + port + SAMA_ENV)", () => {
  const verdict = evaluateEnvironment(okEnv);
  assert.deepEqual(verdict, { ok: true, hostPort: "127.0.0.1:55417" });
  assert.equal(assertSafeDevelopmentTarget(okEnv, "test").hostPort, "127.0.0.1:55417");
});

test("localhost et le port local existant 2026 sont autorisés", () => {
  assert.equal(evaluateDatabaseUrl("postgres://u:p@localhost:2026/x", "DATABASE_URL").ok, true);
});

test("refus : hôte distant (même avec un nom de base « test »)", () => {
  const v = evaluateDatabaseUrl("postgresql://u:p@db.exemple-distant.invalid:5432/samahome_test", "DATABASE_URL");
  assert.equal(v.ok, false);
});

test("refus : hôte qui contient 127.0.0.1 sans l'être", () => {
  assert.equal(evaluateDatabaseUrl("postgresql://u:p@127.0.0.1.exemple.invalid:55417/x", "DATABASE_URL").ok, false);
  assert.equal(evaluateDatabaseUrl("postgresql://u:p@localhost.exemple.invalid:55417/x", "DATABASE_URL").ok, false);
});

test("refus : paramètre de connexion qui remplace l'hôte ou le port", () => {
  for (const p of ["host=db.exemple.invalid", "hostaddr=203.0.113.9", "port=5432", "service=prod", "options=-c%20x"]) {
    assert.equal(evaluateDatabaseUrl(`${LOCAL_OK}?${p}`, "DATABASE_URL").ok, false, p);
  }
});

test("refus : port absent ou hors liste d'autorisation", () => {
  assert.equal(evaluateDatabaseUrl("postgresql://u:p@127.0.0.1/x", "DATABASE_URL").ok, false);
  assert.equal(evaluateDatabaseUrl("postgresql://u:p@127.0.0.1:5432/x", "DATABASE_URL").ok, false);
});

test("refus : configuration absente, vide, illisible ou protocole inattendu", () => {
  assert.equal(evaluateDatabaseUrl(undefined, "DATABASE_URL").ok, false);
  assert.equal(evaluateDatabaseUrl("", "DATABASE_URL").ok, false);
  assert.equal(evaluateDatabaseUrl("pas une url", "DATABASE_URL").ok, false);
  assert.equal(evaluateDatabaseUrl("mysql://u:p@127.0.0.1:55417/x", "DATABASE_URL").ok, false);
});

test("refus : SAMA_ENV absent ou différent de « local »", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_ENV: undefined }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_ENV: "production" }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_ENV: "Local" }).ok, false);
});

test("refus : NODE_ENV=production", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, NODE_ENV: "production" }).ok, false);
});

test("DIRECT_URL, si définie, est soumise aux mêmes règles", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, DIRECT_URL: LOCAL_OK }).ok, true);
  assert.equal(
    evaluateEnvironment({ ...okEnv, DIRECT_URL: "postgresql://u:p@db.exemple-distant.invalid:5432/x" }).ok,
    false,
  );
});

test("assertSafeDevelopmentTarget lève UnsafeTargetError sans exposer les identifiants", () => {
  const secretUrl = "postgresql://utilisateur-secret:motdepasse-secret@db.exemple-distant.invalid:5432/x";
  assert.throws(
    () => assertSafeDevelopmentTarget({ SAMA_ENV: "local", DATABASE_URL: secretUrl }, "test"),
    (error: unknown) => {
      assert.ok(error instanceof UnsafeTargetError);
      assert.doesNotMatch(error.message, /motdepasse-secret|utilisateur-secret/);
      assert.match(error.message, /Aucune connexion n'a été ouverte/);
      return true;
    },
  );
});

// ---------------------------------------------------------------- contournements
test("NODE_ENV=production ne désactive JAMAIS la garde : il la rend plus stricte", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, NODE_ENV: "production" }).ok, false);
  assert.equal(
    evaluateEnvironment({
      SAMA_ENV: "local",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db.exemple-distant.invalid:5432/x",
    }).ok,
    false,
  );
});

test("SAMA_ENV=local seul ne suffit pas : une cible distante reste refusée", () => {
  assert.equal(
    evaluateEnvironment({ SAMA_ENV: "local", DATABASE_URL: "postgresql://u:p@db.exemple-distant.invalid:5432/x" }).ok,
    false,
  );
});

test("refus : paramètres de redirection quelle que soit la casse", () => {
  for (const p of ["HOST=db.exemple.invalid", "Host=db.exemple.invalid", "HostAddr=203.0.113.9", "PORT=5432"]) {
    assert.equal(evaluateDatabaseUrl(`${LOCAL_OK}?${p}`, "DATABASE_URL").ok, false, p);
  }
});

test("refus : URLs suspectes (utilisateur déguisé en hôte, multi-hôtes, formes exotiques)", () => {
  const suspects = [
    "postgresql://127.0.0.1:55417@db.exemple-distant.invalid:5432/x", // 127.0.0.1 en identifiant
    "postgresql://u:p@127.0.0.1:55417,db.exemple-distant.invalid:5432/x", // plusieurs hôtes
    "postgresql://u:p@127.1:55417/x", // forme abrégée non reconnue
    "postgresql://u:p@localhost.:55417/x", // point final
    "postgresql://u:p@LOCALHOST.exemple.invalid:55417/x",
    "postgresql://u:p@0.0.0.0:55417/x",
    "postgresql://u:p@[::ffff:203.0.113.9]:55417/x",
    "postgresql://u:p@127.0.0.1%2eexemple.invalid:55417/x",
    "postgresql:///x?host=/tmp",
    "postgresql://u:p@:55417/x",
  ];
  for (const url of suspects) assert.equal(evaluateDatabaseUrl(url, "DATABASE_URL").ok, false, url);
});

test("variables libpq ambiantes : PGHOST / PGHOSTADDR / PGPORT non locaux refusés", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, PGHOST: "db.exemple-distant.invalid" }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, PGHOSTADDR: "203.0.113.9" }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, PGPORT: "5432" }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, PGHOST: "127.0.0.1", PGPORT: "55417" }).ok, true);
});

// ------------------------------------------------------- procédure de déploiement
const REMOTE = "postgresql://u:p@db.exemple-distant.invalid:5432/x";
const deployEnv = { DATABASE_URL: REMOTE, SAMA_DEPLOY_TARGET_HOST: "db.exemple-distant.invalid" };

test("déploiement : cible distante confirmée par l'opérateur, acceptée", () => {
  assert.equal(evaluateDeployTarget(deployEnv).ok, true);
  assert.equal(assertDeployTarget(deployEnv, "test").hostPort, "db.exemple-distant.invalid:5432");
});

test("déploiement : hôte attendu absent, différent ou local → refusé", () => {
  assert.equal(evaluateDeployTarget({ DATABASE_URL: REMOTE }).ok, false);
  assert.equal(evaluateDeployTarget({ ...deployEnv, SAMA_DEPLOY_TARGET_HOST: "autre.exemple.invalid" }).ok, false);
  assert.equal(
    evaluateDeployTarget({ DATABASE_URL: LOCAL_OK, SAMA_DEPLOY_TARGET_HOST: "127.0.0.1" }).ok,
    false,
  );
});

test("déploiement : refusé depuis un environnement de développement, port absent, redirection d'URL ou DIRECT_URL divergente", () => {
  assert.equal(evaluateDeployTarget({ ...deployEnv, SAMA_ENV: "local" }).ok, false);
  assert.equal(
    evaluateDeployTarget({ ...deployEnv, DATABASE_URL: "postgresql://u:p@db.exemple-distant.invalid/x" }).ok,
    false,
  );
  assert.equal(evaluateDeployTarget({ ...deployEnv, DATABASE_URL: `${REMOTE}?host=autre.exemple.invalid` }).ok, false);
  assert.equal(
    evaluateDeployTarget({ ...deployEnv, DIRECT_URL: "postgresql://u:p@autre.exemple.invalid:5432/x" }).ok,
    false,
  );
  assert.throws(() => assertDeployTarget({ DATABASE_URL: REMOTE }, "test"), UnsafeTargetError);
});

// ---------------------------------------------------------------- marqueur de base
test("marqueur de base de test : valeur exacte uniquement", () => {
  assert.equal(isValidTestMarker(TEST_DB_MARKER), true);
  for (const bad of [null, undefined, "", "samahome_test", "sama-home-local-test-only", `${TEST_DB_MARKER} `]) {
    assert.equal(isValidTestMarker(bad), false, String(bad));
  }
});

// ------------------------------------------------------------- stockage objet (S3)
test("stockage objet : seul un endpoint local explicite est accepté", () => {
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "http://127.0.0.1:9000" }).ok, true);
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "http://localhost:9000" }).ok, true);
  assert.equal(evaluateObjectStorageEndpoint({}).ok, false);
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "" }).ok, false);
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "https://bucket.exemple-distant.invalid" }).ok, false);
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "http://127.0.0.1.exemple.invalid" }).ok, false);
  assert.equal(evaluateObjectStorageEndpoint({ AWS_ENDPOINT_URL: "ftp://127.0.0.1" }).ok, false);
  assert.throws(() => assertLocalObjectStorage({ AWS_ENDPOINT_URL: "https://x.exemple.invalid" }, "test"), UnsafeTargetError);
});

// -------------------------------------------------------------- base attendue
test("base attendue : SAMA_EXPECTED_DB absent ou différent du nom de la base → refusé", () => {
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_EXPECTED_DB: undefined }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_EXPECTED_DB: "autre_base" }).ok, false);
  assert.equal(evaluateEnvironment({ ...okEnv, SAMA_EXPECTED_DB: "anything" }).ok, true);
});

test("base attendue : DIRECT_URL doit désigner la même base", () => {
  const other = "postgresql://user:pass@127.0.0.1:55417/autre_base";
  assert.equal(evaluateEnvironment({ ...okEnv, DIRECT_URL: LOCAL_OK }).ok, true);
  assert.equal(evaluateEnvironment({ ...okEnv, DIRECT_URL: other }).ok, false);
});

test("le vérificateur de marqueur (processus enfant) utilise la même valeur que la garde", () => {
  const cjs = fs.readFileSync(new URL("../../../scripts/lib/check-test-marker.cjs", import.meta.url), "utf8");
  assert.ok(cjs.includes(`const MARKER = "${TEST_DB_MARKER}";`));
});
