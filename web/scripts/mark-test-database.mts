/**
 * Pose le marqueur de base de test SAMA HOME (COMMENT ON DATABASE).
 *
 * Usage : npx tsx scripts/mark-test-database.mts <nom-de-la-base> [--apply]
 *
 * Sans --apply : vérifie seulement et affiche ce qui serait fait (aucune écriture).
 * Refuse si : la cible n'est pas locale (garde), le nom donné diffère de la base
 * réellement connectée, la base contient une table (elle n'est pas vide), ou elle
 * porte déjà un commentaire différent. Ne touche jamais une base existante non vide.
 */
import "dotenv/config";
import "./lib/safe-env.mjs";
import { Client } from "pg";
import { TEST_DB_MARKER } from "../src/lib/env-guard";

function fail(message: string): never {
  console.error(`[mark-test-database] REFUSÉ : ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const expectedName = args.find((a) => !a.startsWith("--"));
if (!expectedName) fail("nom de la base obligatoire.");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query<{ db: string; comment: string | null }>(
    "SELECT current_database() AS db, shobj_description(d.oid, 'pg_database') AS comment FROM pg_database d WHERE d.datname = current_database()",
  );
  const current = rows[0];
  if (!current || current.db !== expectedName) fail("le nom donné ne correspond pas à la base réellement connectée.");

  const tables = await client.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')",
  );
  if (tables.rows[0]?.n !== "0") fail(`la base "${current.db}" n'est pas vide (${tables.rows[0]?.n} table(s)).`);

  if (current.comment !== null && current.comment !== TEST_DB_MARKER) fail("la base porte déjà un autre commentaire.");
  if (current.comment === TEST_DB_MARKER) {
    console.log(`[mark-test-database] La base "${current.db}" est déjà marquée.`);
  } else if (!apply) {
    console.log(`[mark-test-database] SIMULATION : la base vide "${current.db}" recevrait le marqueur. Relancer avec --apply.`);
  } else {
    const safeName = current.db.replace(/"/g, '""');
    await client.query(`COMMENT ON DATABASE "${safeName}" IS '${TEST_DB_MARKER}'`);
    console.log(`[mark-test-database] Marqueur posé sur "${current.db}".`);
  }
} finally {
  await client.end();
}
