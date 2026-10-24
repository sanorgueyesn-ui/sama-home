/**
 * Marqueur explicite d'une base de TEST SAMA HOME.
 *
 * Un nom de base ou une adresse locale ne prouvent pas que les données sont
 * fictives (une copie de la production peut être restaurée en local). Le
 * marqueur est un commentaire de base (`COMMENT ON DATABASE`) valant EXACTEMENT
 * TEST_DB_MARKER (src/lib/env-guard.ts), posé uniquement par
 * scripts/mark-test-database.mts sur une base VIDE explicitement désignée.
 *
 * À appeler APRÈS la garde de cible locale (import "./safe-env"), avant toute
 * opération destructive, migration ou seed de test. La lecture se fait dans une
 * session en lecture seule.
 */
import { Client } from "pg";
import { isValidTestMarker, UnsafeTargetError } from "../../src/lib/env-guard";

export async function readDatabaseMarker(connectionString: string): Promise<{ database: string; comment: string | null }> {
  const client = new Client({ connectionString, options: "-c default_transaction_read_only=on" });
  await client.connect();
  try {
    const result = await client.query<{ db: string; comment: string | null }>(
      "SELECT current_database() AS db, shobj_description(d.oid, 'pg_database') AS comment FROM pg_database d WHERE d.datname = current_database()",
    );
    const row = result.rows[0];
    return { database: row?.db ?? "", comment: row?.comment ?? null };
  } finally {
    await client.end();
  }
}

export async function assertTestDatabaseMarker(connectionString: string | undefined, context: string): Promise<void> {
  if (!connectionString) {
    throw new UnsafeTargetError(`[GARDE MARQUEUR] ${context} REFUSÉ — DATABASE_URL absente.`);
  }
  const { database, comment } = await readDatabaseMarker(connectionString);
  const expected = process.env.SAMA_EXPECTED_DB;
  if (expected && database !== expected) {
    throw new UnsafeTargetError(
      `[GARDE MARQUEUR] ${context} REFUSÉ — la base connectée n'est pas la base attendue (SAMA_EXPECTED_DB). Aucune modification n'a été faite.`,
    );
  }
  if (!isValidTestMarker(comment)) {
    throw new UnsafeTargetError(
      `[GARDE MARQUEUR] ${context} REFUSÉ — la base "${database}" n'est pas marquée comme base de test SAMA HOME. ` +
        "Aucune modification n'a été faite. Marquer une base VIDE avec scripts/mark-test-database.mts.",
    );
  }
}
