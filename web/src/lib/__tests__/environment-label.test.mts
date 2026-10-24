// Tests du libellé d'environnement de la console de plateforme (src/lib/environment-label.ts).
// Module PUR : aucune connexion, aucun réseau ; valeurs fictives uniquement.
import test from "node:test";
import assert from "node:assert/strict";
import { getEnvironmentLabel } from "../environment-label";

const LOCAL_OK = {
  SAMA_ENV: "local",
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://utilisateur-fictif:motdepasse-fictif@127.0.0.1:55417/base_fictive_locale",
  SAMA_EXPECTED_DB: "base_fictive_locale",
};

test("local valide : « Local — base de test »", () => {
  const r = getEnvironmentLabel(LOCAL_OK);
  assert.equal(r.kind, "local");
  assert.equal(r.label, "Local — base de test");
});

test("production valide (NODE_ENV=production, SAMA_ENV absent ou vide) : « Production »", () => {
  for (const env of [{ NODE_ENV: "production" }, { NODE_ENV: "production", SAMA_ENV: "" }]) {
    const r = getEnvironmentLabel(env);
    assert.equal(r.kind, "production");
    assert.equal(r.label, "Production");
  }
});

test("production avec SAMA_ENV défini (même « local » ou « production ») : configuration incohérente", () => {
  for (const sama of ["local", "production", "Local", "dev"]) {
    const r = getEnvironmentLabel({ NODE_ENV: "production", SAMA_ENV: sama });
    assert.equal(r.kind, "inconsistent", sama);
    assert.match(r.label, /incohérente/);
  }
  assert.equal(getEnvironmentLabel({ ...LOCAL_OK, NODE_ENV: "production" }).kind, "inconsistent");
});

test("configuration absente, partielle ou inattendue : environnement non identifié (alerte)", () => {
  const cases = [
    {},
    { NODE_ENV: "development" },
    { NODE_ENV: "development", SAMA_ENV: "local" },
    { ...LOCAL_OK, SAMA_ENV: undefined },
    { ...LOCAL_OK, SAMA_ENV: "Local" },
    { ...LOCAL_OK, SAMA_EXPECTED_DB: "autre_base" },
    { ...LOCAL_OK, DATABASE_URL: "postgresql://u:p@db.exemple-distant.invalid:5432/base_fictive_locale" },
    { ...LOCAL_OK, DATABASE_URL: `${LOCAL_OK.DATABASE_URL}?host=db.exemple.invalid` },
    { ...LOCAL_OK, NODE_ENV: "test" },
    { ...LOCAL_OK, NODE_ENV: undefined },
  ];
  for (const env of cases) {
    const r = getEnvironmentLabel(env);
    assert.equal(r.kind, "unknown", JSON.stringify(Object.keys(env)));
    assert.equal(r.label, "Environnement non identifié");
  }
});

test("jamais d'hôte, de nom de base, d'identifiant ni de secret dans le résultat", () => {
  const secrets = ["utilisateur-fictif", "motdepasse-fictif", "127.0.0.1", "55417", "base_fictive_locale", "db.exemple-distant.invalid"];
  const envs = [
    LOCAL_OK,
    { ...LOCAL_OK, DATABASE_URL: "postgresql://utilisateur-fictif:motdepasse-fictif@db.exemple-distant.invalid:5432/base_fictive_locale" },
    { ...LOCAL_OK, NODE_ENV: "production" },
    { NODE_ENV: "production", DATABASE_URL: LOCAL_OK.DATABASE_URL },
  ];
  for (const env of envs) {
    const serialized = JSON.stringify(getEnvironmentLabel(env));
    for (const secret of secrets) assert.ok(!serialized.includes(secret), `« ${secret} » présent dans le résultat`);
  }
});

test("le libellé n'affirme ni santé ni disponibilité (aucun « Active », « Opérationnel », « En ligne »)", () => {
  const all = [
    getEnvironmentLabel(LOCAL_OK),
    getEnvironmentLabel({ NODE_ENV: "production" }),
    getEnvironmentLabel({ NODE_ENV: "production", SAMA_ENV: "local" }),
    getEnvironmentLabel({}),
  ];
  for (const r of all) assert.doesNotMatch(`${r.label} ${r.hint}`, /Active|Opérationnel|En ligne|disponible/i);
});
