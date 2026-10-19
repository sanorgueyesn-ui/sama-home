#!/usr/bin/env -S npx tsx
/**
 * Sauvegarde PostgreSQL de SAMA HOME — Bloc P.1.
 *
 * Usage :
 *   npx tsx scripts/backup-db.mts
 *   npm run backup
 *
 * Comportement :
 *   - Lit DATABASE_URL depuis l'environnement (jamais une valeur par défaut
 *     inventée) ; échoue immédiatement et clairement si absente.
 *   - Exécute `pg_dump` en format custom (-Fc), fichier daté dans
 *     BACKUP_DIR/daily/ (BACKUP_DIR par défaut : ./backups, surchageable
 *     par variable d'environnement pour pointer vers un volume monté ou un
 *     autre stockage sécurisé sans changer ce fichier).
 *   - Vérifie que le fichier produit existe et dépasse une taille minimale
 *     plausible (protection contre un dump silencieusement vide/tronqué).
 *   - Promeut une copie vers weekly/ (le dimanche) et monthly/ (le 1er du
 *     mois) si aucune n'existe déjà pour la période courante.
 *   - Applique la rétention (7 daily / 4 weekly / 3 monthly) en ne
 *     supprimant jamais le dernier fichier valide d'un dossier.
 *   - N'affiche JAMAIS le mot de passe ni l'URL complète de connexion.
 *   - Code de sortie non nul en cas d'échec à n'importe quelle étape.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

const RETENTION = { daily: 7, weekly: 4, monthly: 3 };
const MIN_DUMP_BYTES = 200; // un dump pg_dump -Fc valide fait toujours plus que ça, même sur une base vide (en-tête du format + catalogue)

function fail(message: string): never {
  console.error(`[backup-db] ÉCHEC : ${message}`);
  process.exit(1);
}

function parseConnection(databaseUrl: string) {
  // On ne reconstruit QUE ce dont pg_dump a besoin en arguments séparés
  // (jamais la chaîne complète dans une commande affichée/loguée), et le
  // mot de passe part exclusivement via la variable d'environnement
  // PGPASSWORD du sous-processus, jamais en argument de ligne de commande
  // (visible dans la liste des processus) ni dans un log.
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    fail("DATABASE_URL doit être une URL postgresql:// — schéma inattendu.");
  }
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

function timestampForFilename(d: Date) {
  return d.toISOString().replace(/:/g, "-").replace(/\..+/, "");
}
function isoWeekKey(d: Date) {
  // Clé "année-semaineISO", utilisée uniquement pour savoir si une
  // promotion hebdomadaire a déjà eu lieu cette semaine — pas une
  // dépendance métier, aucun lien avec le code applicatif.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

/** Supprime les fichiers les plus anciens d'un dossier au-delà de `keep`,
 * jamais le dernier fichier restant (filet de sécurité : ne jamais vider un
 * dossier de rétention, même si `keep` était mal configuré à 0). */
function pruneRetention(dir: string, keep: number) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".dump"))
    .sort(); // noms préfixés par date ISO -> tri lexicographique = tri chronologique
  const effectiveKeep = Math.max(keep, 1);
  const toDelete = files.slice(0, Math.max(0, files.length - effectiveKeep));
  for (const f of toDelete) {
    fs.unlinkSync(path.join(dir, f));
    console.log(`[backup-db] Rétention : suppression de l'ancien backup ${path.basename(dir)}/${f}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL n'est pas définie. Voir .env.example — aucune valeur par défaut n'est utilisée.");
  }
  const conn = parseConnection(databaseUrl!);

  const backupRoot = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.resolve(process.cwd(), "backups");
  const dailyDir = path.join(backupRoot, "daily");
  const weeklyDir = path.join(backupRoot, "weekly");
  const monthlyDir = path.join(backupRoot, "monthly");
  ensureDir(dailyDir);
  ensureDir(weeklyDir);
  ensureDir(monthlyDir);

  const now = new Date();
  const filename = `samahome_${conn.database}_${timestampForFilename(now)}.dump`;
  const dailyPath = path.join(dailyDir, filename);

  console.log(`[backup-db] Sauvegarde de la base "${conn.database}" (hôte masqué) en cours...`);

  try {
    await execFileAsync(
      "pg_dump",
      ["-h", conn.host, "-p", conn.port, "-U", conn.user, "-d", conn.database, "-Fc", "-f", dailyPath],
      { env: { ...process.env, PGPASSWORD: conn.password } },
    );
  } catch (error: any) {
    const detail = error?.stderr || error?.message || "erreur inconnue";
    fail(`pg_dump a échoué — ${detail}`);
  }

  if (!fs.existsSync(dailyPath)) {
    fail(`Le fichier de sauvegarde attendu n'existe pas après pg_dump : ${dailyPath}`);
  }
  const size = fs.statSync(dailyPath).size;
  if (size < MIN_DUMP_BYTES) {
    fs.unlinkSync(dailyPath); // un dump trop petit est considéré invalide, on ne le laisse pas polluer la rétention
    fail(`Le fichier de sauvegarde est anormalement petit (${size} octets) — supprimé, considéré invalide.`);
  }
  console.log(`[backup-db] OK — backups/daily/${filename} (${(size / 1024).toFixed(1)} Ko)`);

  // Vérification d'intégrité : pg_restore --list ne restaure rien, il lit
  // seulement le catalogue du dump pour confirmer qu'il est structurellement
  // valide (section 7 : "vérifier que PostgreSQL accepte le dump").
  try {
    await execFileAsync("pg_restore", ["--list", dailyPath]);
    console.log("[backup-db] Intégrité du dump confirmée (pg_restore --list).");
  } catch (error) {
    fail(`Le dump créé ne passe pas la vérification d'intégrité (pg_restore --list) — ${error instanceof Error ? error.message.split("\n")[0] : "erreur inconnue"}.`);
  }

  // Promotion hebdomadaire/mensuelle — une seule copie par période, jamais
  // une deuxième le même jour ni un doublon si le script tourne plusieurs
  // fois dans la même semaine/le même mois.
  const weekTag = isoWeekKey(now);
  const weeklyExists = fs.readdirSync(weeklyDir).some((f) => f.includes(`_wk${weekTag}_`));
  if (!weeklyExists) {
    const weeklyPath = path.join(weeklyDir, `samahome_${conn.database}_wk${weekTag}_${timestampForFilename(now)}.dump`);
    fs.copyFileSync(dailyPath, weeklyPath);
    console.log(`[backup-db] Promotion hebdomadaire : backups/weekly/${path.basename(weeklyPath)}`);
  }
  const monthTag = monthKey(now);
  const monthlyExists = fs.readdirSync(monthlyDir).some((f) => f.includes(`_mo${monthTag}_`));
  if (!monthlyExists) {
    const monthlyPath = path.join(monthlyDir, `samahome_${conn.database}_mo${monthTag}_${timestampForFilename(now)}.dump`);
    fs.copyFileSync(dailyPath, monthlyPath);
    console.log(`[backup-db] Promotion mensuelle : backups/monthly/${path.basename(monthlyPath)}`);
  }

  pruneRetention(dailyDir, RETENTION.daily);
  pruneRetention(weeklyDir, RETENTION.weekly);
  pruneRetention(monthlyDir, RETENTION.monthly);

  console.log("[backup-db] Terminé avec succès.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
