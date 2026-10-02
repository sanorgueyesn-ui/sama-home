#!/usr/bin/env -S npx tsx
/**
 * Restauration PostgreSQL de SAMA HOME — Bloc P.1.
 *
 * Usage :
 *   npx tsx scripts/restore-db.mts <chemin-du-dump> <nom-base-destination>
 *   npm run restore -- backups/daily/samahome_samahome_dev_2026-10-02T...dump samahome_restore_test
 *
 * ⚠️ Ce script ne restaure JAMAIS vers la base identifiée par DATABASE_URL
 * (protection volontaire — une restauration écrase le contenu de la base
 * cible, ce qui ne doit jamais arriver par accident sur la base en cours
 * d'utilisation). La base de destination doit être un nom EXPLICITE,
 * différent de celui dans DATABASE_URL, fourni en argument.
 *
 * Comportement :
 *   - Crée la base de destination si elle n'existe pas (CREATE DATABASE).
 *   - Exécute pg_restore avec le même hôte/port/utilisateur que
 *     DATABASE_URL (la restauration se fait sur la même instance
 *     PostgreSQL, dans une base différente — jamais vers un autre serveur
 *     sans action explicite de l'opérateur).
 *   - Affiche un résumé des tables restaurées et leur nombre de lignes.
 *   - N'affiche jamais le mot de passe.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

function fail(message: string): never {
  console.error(`[restore-db] ÉCHEC : ${message}`);
  process.exit(1);
}

function parseConnection(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    sourceDatabase: url.pathname.replace(/^\//, ""),
  };
}

async function main() {
  const [dumpPathArg, targetDbArg] = process.argv.slice(2);
  if (!dumpPathArg || !targetDbArg) {
    fail("Usage : npx tsx scripts/restore-db.mts <chemin-du-dump> <nom-base-destination>");
  }
  const dumpPath = dumpPathArg!;
  const targetDb = targetDbArg!;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL n'est pas définie — nécessaire pour connaître l'hôte/port/utilisateur PostgreSQL cible.");
  }
  const conn = parseConnection(databaseUrl!);

  if (targetDb === conn.sourceDatabase) {
    fail(
      `Refusé : la base de destination ("${targetDb}") est identique à celle de DATABASE_URL. ` +
        "Une restauration doit toujours cibler une base de test explicite, jamais la base en cours d'utilisation.",
    );
  }
  if (!fs.existsSync(dumpPath)) {
    fail(`Fichier de dump introuvable : ${dumpPath}`);
  }

  console.log(`[restore-db] Vérification d'intégrité du dump (pg_restore --list)...`);
  try {
    await execFileAsync("pg_restore", ["--list", dumpPath]);
  } catch (error) {
    fail(`Le dump ne passe pas la vérification d'intégrité — ${error instanceof Error ? error.message.split("\n")[0] : "erreur inconnue"}.`);
  }

  console.log(`[restore-db] Création de la base de destination "${targetDb}" si nécessaire...`);
  const adminClient = new Client({ host: conn.host, port: Number(conn.port), user: conn.user, password: conn.password, database: "postgres" });
  await adminClient.connect();
  try {
    const exists = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
    if (exists.rowCount === 0) {
      // Nom de base passé en argument explicite par l'opérateur, jamais une
      // entrée utilisateur non contrôlée — identifiant entre guillemets
      // doubles pour rester valide même avec des caractères spéciaux.
      await adminClient.query(`CREATE DATABASE "${targetDb.replace(/"/g, '""')}"`);
      console.log(`[restore-db] Base "${targetDb}" créée.`);
    } else {
      console.log(`[restore-db] La base "${targetDb}" existe déjà — restauration dans la base existante.`);
    }
  } finally {
    await adminClient.end();
  }

  console.log(`[restore-db] Restauration en cours (pg_restore)...`);
  const t0 = Date.now();
  try {
    await execFileAsync(
      "pg_restore",
      ["-h", conn.host, "-p", conn.port, "-U", conn.user, "-d", targetDb, "--no-owner", "--role", conn.user, dumpPath],
      { env: { ...process.env, PGPASSWORD: conn.password } },
    );
  } catch (error) {
    fail(`pg_restore a échoué — ${error instanceof Error ? error.message.split("\n")[0] : "erreur inconnue"}.`);
  }
  console.log(`[restore-db] Restauration terminée en ${Date.now() - t0}ms.`);

  console.log(`[restore-db] Résumé des tables restaurées :`);
  const targetClient = new Client({ host: conn.host, port: Number(conn.port), user: conn.user, password: conn.password, database: targetDb });
  await targetClient.connect();
  try {
    const tables = await targetClient.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    );
    for (const { tablename } of tables.rows) {
      const count = await targetClient.query(`SELECT COUNT(*) as c FROM "${tablename}"`);
      console.log(`  ${tablename}: ${count.rows[0].c} ligne(s)`);
    }
  } finally {
    await targetClient.end();
  }

  console.log(`[restore-db] Terminé avec succès. Base de test : "${targetDb}" (à supprimer après vérification : dropdb ${targetDb}).`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
