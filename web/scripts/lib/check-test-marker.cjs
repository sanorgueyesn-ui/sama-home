/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Vérification SYNCHRONE-compatible (processus enfant) du marqueur de base de
 * test, appelée par prisma7.config.ts avant toute commande Prisma qui se
 * connecte. Lecture seule (session en lecture seule). N'affiche jamais l'URL.
 *
 * Codes de sortie : 0 = base marquée et attendue ; 2 = connexion impossible ;
 * 3 = marqueur absent ou différent ; 4 = nom de base différent de l'attendu.
 *
 * MARKER doit rester identique à TEST_DB_MARKER (src/lib/env-guard.ts) : un test
 * unitaire (env-guard.test.mts) le vérifie.
 */
const { Client } = require("pg");

const MARKER = "SAMA-HOME-LOCAL-TEST-ONLY";

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    options: "-c default_transaction_read_only=on",
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT current_database() AS db, shobj_description(d.oid, 'pg_database') AS comment FROM pg_database d WHERE d.datname = current_database()",
    );
    const row = result.rows[0];
    if (!row || row.comment !== MARKER) {
      console.error(`La base "${row ? row.db : "?"}" n'est pas marquée comme base de test SAMA HOME.`);
      process.exitCode = 3;
    } else if (process.env.SAMA_EXPECTED_DB && row.db !== process.env.SAMA_EXPECTED_DB) {
      console.error("La base connectée n'est pas la base attendue (SAMA_EXPECTED_DB).");
      process.exitCode = 4;
    }
  } catch (error) {
    console.error(`Connexion à la base locale impossible (${(error && (error.code || error.name)) || "erreur"}).`);
    process.exitCode = 2;
  } finally {
    await client.end().catch(() => {});
  }
})();
