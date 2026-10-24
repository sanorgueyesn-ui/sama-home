#!/usr/bin/env -S npx tsx
/**
 * Bootstrap du premier administrateur de PLATEFORME — Lot D12-P63.
 *
 * Distinct de `prisma/seed.ts` (qui crée un `role: "ADMIN"` d'établissement,
 * jamais un administrateur de plateforme — voir
 * docs/production/BOOTSTRAP_PLATFORM_ADMIN.md) : ce script crée un `User`
 * avec `isPlatformAdmin: true`, sans `role` ni `establishmentId`, jamais
 * l'inverse.
 *
 * MODE PAR DÉFAUT : VÉRIFICATION SEULE, AUCUNE ÉCRITURE.
 *   npx tsx scripts/bootstrap-platform-admin.mts
 *   npm run bootstrap:platform-admin
 *
 * MODE ÉCRITURE (crée réellement le compte) :
 *   npx tsx scripts/bootstrap-platform-admin.mts --write
 *   npm run bootstrap:platform-admin -- --write
 *
 * DEUX MODES SÉPARÉS (phase 1.3), la cible étant vérifiée AVANT toute connexion,
 * y compris en simple vérification :
 *   - LOCAL (défaut) : charge `.env.development.local` par-dessus `.env`, exige la
 *     garde de développement (SAMA_ENV=local, SAMA_EXPECTED_DB, base locale
 *     autorisée, aucune redirection d'URL) et le marqueur exact de base de test.
 *     Une cible distante est refusée. En écriture : `--target-host=<hôte local>`.
 *   - PRODUCTION (jamais par défaut) : `--production` + SAMA_DEPLOY_TARGET_HOST
 *     (dans l'environnement du processus) + `--target-host=<même hôte>`. Le
 *     drapeau seul ne suffit jamais. `.env.development.local` n'est pas chargé.
 *
 * Variables d'environnement requises (voir .env.example) — vérifiées
 * intégralement AVANT toute connexion à la base, dans tous les modes :
 *   BOOTSTRAP_PLATFORM_ADMIN_USERNAME
 *   BOOTSTRAP_PLATFORM_ADMIN_PASSWORD
 *   BOOTSTRAP_PLATFORM_ADMIN_NAME
 *
 * Variable supplémentaire requise UNIQUEMENT avec --write (confirmation
 * explicite, distincte du simple indicateur --write) :
 *   BOOTSTRAP_PLATFORM_ADMIN_CONFIRM
 *     Doit valoir EXACTEMENT la même valeur que
 *     BOOTSTRAP_PLATFORM_ADMIN_USERNAME — une faute de frappe sur --write
 *     seul (ex. script relancé par erreur depuis un historique de commandes)
 *     ne suffit donc jamais, à elle seule, à déclencher une écriture.
 *
 * Protections :
 *   - Aucune écriture par défaut (mode vérification uniquement).
 *   - Refuse si BOOTSTRAP_PLATFORM_ADMIN_USERNAME == SEED_ADMIN_USERNAME —
 *     jamais une réutilisation implicite du compte historique de
 *     `prisma/seed.ts`.
 *   - Refuse si un compte existe déjà pour cet identifiant (jamais modifié,
 *     jamais promu).
 *   - Jamais de mot de passe par défaut, jamais de secret affiché (mot de
 *     passe, hash, chaîne de connexion complète) — seuls l'hôte et le port
 *     de DATABASE_URL sont affichés, pour que l'opérateur puisse vérifier
 *     visuellement la cible réelle AVANT d'utiliser --write.
 *
 * LIMITE ASSUMÉE, DOCUMENTÉE PLUTÔT QUE CONTOURNÉE PAR UNE FAUSSE GARANTIE :
 * ce script ne peut PAS déterminer de façon fiable si DATABASE_URL pointe
 * vers un environnement de développement ou de production — un nom d'hôte
 * ne le prouve jamais à lui seul (ex. un tunnel/forwarding local peut
 * exposer une base de production sous une apparence locale, et l'inverse).
 * AUCUNE vérification automatique de ce type n'est donc tentée ici : la
 * vérification de l'hôte/port affichés avant --write reste une
 * responsabilité humaine, jamais déléguée à ce script. Voir
 * docs/production/BOOTSTRAP_PLATFORM_ADMIN.md, section correspondante.
 *
 * N'est appelé automatiquement NULLE PART (ni `prisma/seed.ts`, ni le build
 * Next.js, ni le démarrage de l'application) — exécution manuelle
 * uniquement, jamais dans un pipeline automatisé sans supervision humaine.
 */
import "dotenv/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { evaluateBootstrapTarget } from "../src/lib/env-guard.js";
import { assertTestDatabaseMarker } from "./lib/db-marker.mjs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SALT_ROUNDS = 12; // Même paramètre que src/lib/password.ts — jamais réinventé.
const LOG_PREFIX = "[bootstrap-platform-admin]";

// Marque un échec déjà signalé par `fail()` (message explicite déjà affiché,
// code de sortie déjà fixé) — distingue cet échec "propre" d'une erreur
// réellement inattendue (ex. connexion DB refusée), qui doit, elle, rester
// visible avec sa pile d'appel complète dans le `catch` de `main()`.
class BootstrapRefusedError extends Error {}

function fail(message: string): never {
  console.error(`${LOG_PREFIX} ÉCHEC : ${message}`);
  process.exitCode = 1;
  throw new BootstrapRefusedError(message);
}

function parseHostPort(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "(DATABASE_URL présente mais illisible comme URL — vérifiez son format)";
  }
}

async function main() {
  const writeMode = process.argv.includes("--write");

  // Mode LOCAL (défaut) : la configuration de développement est chargée PAR-DESSUS
  // `.env` (qui contient la production) avant toute lecture de variable. Mode
  // PRODUCTION (--production) : `.env.development.local` n'est jamais chargé.
  if (!process.argv.includes("--production")) {
    loadDotenv({ path: path.resolve(process.cwd(), ".env.development.local"), override: true, quiet: true });
  }

  // --- 1. Vérification de TOUTES les variables requises, AVANT toute
  //        connexion à la base (y compris en mode vérification). ---
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL n'est pas définie. Rien n'a été vérifié ni écrit.");
  }

  const username = process.env.BOOTSTRAP_PLATFORM_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_PLATFORM_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_PLATFORM_ADMIN_NAME;
  if (!username || !password || !name) {
    fail(
      "BOOTSTRAP_PLATFORM_ADMIN_USERNAME, BOOTSTRAP_PLATFORM_ADMIN_PASSWORD et BOOTSTRAP_PLATFORM_ADMIN_NAME " +
        "doivent être définis avant d'exécuter ce script (voir .env.example). Rien n'a été vérifié ni écrit.",
    );
  }

  // Jamais réutiliser implicitement le compte historique de prisma/seed.ts.
  if (process.env.SEED_ADMIN_USERNAME && process.env.SEED_ADMIN_USERNAME === username) {
    fail(
      "BOOTSTRAP_PLATFORM_ADMIN_USERNAME coïncide avec SEED_ADMIN_USERNAME. " +
        "Ce script ne doit jamais réutiliser implicitement le compte créé par prisma/seed.ts " +
        "(un ADMIN d'établissement, pas un administrateur de plateforme) — choisissez un identifiant distinct dédié.",
    );
  }

  if (writeMode) {
    const confirm = process.env.BOOTSTRAP_PLATFORM_ADMIN_CONFIRM;
    if (confirm !== username) {
      fail(
        "--write exige BOOTSTRAP_PLATFORM_ADMIN_CONFIRM, qui doit valoir EXACTEMENT la même valeur que " +
          "BOOTSTRAP_PLATFORM_ADMIN_USERNAME. Confirmation absente ou ne correspondant pas — rien n'a été écrit.",
      );
    }
  }

  // Phase 1.3 — cible vérifiée AVANT toute connexion, dans TOUS les modes (y
  // compris la simple vérification, qui lit la base). Deux modes séparés, voir
  // evaluateBootstrapTarget() (src/lib/env-guard.ts) : LOCAL par défaut, PRODUCTION
  // uniquement avec --production + SAMA_DEPLOY_TARGET_HOST (environnement) +
  // --target-host. `--target-host` seul n'autorise jamais une cible distante.
  const verdict = evaluateBootstrapTarget(process.argv, process.env);
  if (!verdict.ok) {
    fail(`${verdict.reason} Rien n'a été vérifié ni écrit.`);
  }
  const mode = verdict.mode;
  if (mode === "production") {
    console.log(`${LOG_PREFIX} ATTENTION : mode PRODUCTION explicitement demandé.`);
  }

  const hostPort = parseHostPort(databaseUrl);
  console.log(`${LOG_PREFIX} Cible (hôte:port uniquement, jamais les identifiants) : ${hostPort}`);
  console.log(
    `${LOG_PREFIX} Vérifiez vous-même qu'il s'agit bien de l'environnement voulu avant d'utiliser --write — ` +
      "ce script ne peut pas le déterminer de façon fiable (voir le commentaire en tête de fichier).",
  );

  // --- 2. Connexion, uniquement après que toutes les vérifications
  //        ci-dessus ont réussi (PrismaClient/PrismaPg importés en tête de
  //        fichier, mais seulement INSTANCIÉS ici, jamais avant). ---
  // Mode local : la base doit en plus porter le marqueur exact de base de test
  // (lecture seule) ; sinon refus, sans aucune écriture.
  if (mode === "local") {
    await assertTestDatabaseMarker(databaseUrl, "bootstrap local");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) {
      fail(
        `Un compte existe déjà pour l'identifiant « ${username} ». Ce script ne modifie et ne promeut jamais ` +
          "un compte existant — choisissez un identifiant distinct, ou gérez ce compte par un autre moyen. Rien n'a été écrit.",
      );
    }

    if (!writeMode) {
      console.log(`${LOG_PREFIX} MODE VÉRIFICATION SEULE — AUCUNE ÉCRITURE EFFECTUÉE.`);
      console.log(`${LOG_PREFIX} Serait créé : username="${username}", name="${name}", role=NULL (absent), `
        + `establishmentId=NULL (absent), isPlatformAdmin=true.`);
      console.log(`${LOG_PREFIX} Aucun compte avec cet identifiant n'existe actuellement — la création serait possible.`);
      console.log(`${LOG_PREFIX} Relancez avec --write (et BOOTSTRAP_PLATFORM_ADMIN_CONFIRM défini) pour créer réellement ce compte.`);
      return;
    }

    // --- 3. Écriture réelle — uniquement ici, après toutes les
    //        vérifications et la confirmation explicite. ---
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const created = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        isPlatformAdmin: true,
        // `role` et `establishmentId` volontairement ABSENTS de `data` —
        // jamais définis, jamais "ADMIN" pour simplement ouvrir des pages,
        // jamais rattaché à un établissement (voir schema.prisma, model User :
        // "NULL pour un compte de plateforme").
      },
      select: { id: true, username: true, isPlatformAdmin: true },
    });

    console.log(`${LOG_PREFIX} Compte de plateforme créé : id=${created.id}, username="${created.username}", isPlatformAdmin=${created.isPlatformAdmin}.`);
    console.log(`${LOG_PREFIX} Aucun mot de passe ni hash n'est affiché. Transmettez-le au titulaire par un canal sécurisé, jamais par ce terminal/journal.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (error instanceof BootstrapRefusedError) {
    // Déjà signalé par fail() ci-dessus — ne pas dupliquer le message.
    return;
  }
  console.error(`${LOG_PREFIX} Erreur inattendue :`, error);
  process.exitCode = 1;
});
