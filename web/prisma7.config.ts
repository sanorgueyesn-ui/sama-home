import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { assertSafeDevelopmentTarget, UnsafeTargetError } from "./src/lib/env-guard";

// Garde contre la production — le CLI Prisma lit ce fichier pour TOUTES ses
// commandes. Refus par défaut : seules les commandes qui n'ouvrent jamais de
// connexion (génération du client, validation, formatage, aide) sont
// exemptées ; toute autre commande (migrate, db, studio, commande inconnue
// ou arguments illisibles) exige une cible locale explicite.
//
// NODE_ENV ne dispense JAMAIS de cette garde (NODE_ENV=production la rend au
// contraire plus stricte). Les opérations de production légitimes ne passent
// PAS par ce fichier : voir scripts/deploy/prisma-deploy.config.ts
// (appelé explicitement avec --config, procédure distincte et documentée
// dans docs/production/DEPLOY.md).
const NO_CONNECTION_COMMANDS = ["generate", "validate", "format", "version", "help", "--help", "-h", "--version", "-v"];
const prismaCommand = process.argv[2];

if (!(prismaCommand && NO_CONNECTION_COMMANDS.includes(prismaCommand))) {
  loadDotenv({ path: ".env.development.local", override: true, quiet: true });
  const context = `prisma ${prismaCommand ?? "(commande inconnue)"}`;
  assertSafeDevelopmentTarget(process.env, context);

  // Marqueur de base de test : vérifié (lecture seule, processus enfant) avant
  // TOUTE commande qui se connecte — y compris un `migrate deploy` direct.
  // Base non marquée, base inattendue ou connexion impossible : refus.
  try {
    execFileSync(process.execPath, [path.resolve(process.cwd(), "scripts/lib/check-test-marker.cjs")], {
      env: process.env,
      stdio: "pipe",
      timeout: 15000,
    });
  } catch (error) {
    const detail = String((error as { stderr?: Buffer }).stderr ?? "").trim() || "vérification impossible";
    throw new UnsafeTargetError(
      `[GARDE MARQUEUR] ${context} REFUSÉ — ${detail} Aucune commande Prisma n'a été exécutée. ` +
        "Marquer une base VIDE avec : npm run db:mark-test -- <base> --apply",
    );
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
