import "dotenv/config";
import "./lib/safe-env.mjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ⛔ SCRIPT NEUTRALISÉ (phase 0.4). DDL brut qui modifie le schéma hors du
// mécanisme de migrations Prisma (la colonne est déjà couverte par la
// migration 20261019100000_add_user_permissions). Contenu conservé pour audit.
// Réactivation : NEUTRALIZED à false, base locale UNIQUEMENT, après autorisation.
const NEUTRALIZED = true as boolean;
if (NEUTRALIZED) {
  throw new Error("SCRIPT NEUTRALISÉ : add-permissions-column.mts ne doit jamais être exécuté. Aucune connexion ouverte.");
}

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking and adding 'permissions' column to 'User' table...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT;
    `);
    console.log("Column 'permissions' successfully verified / added to table 'User'.");
  } catch (err) {
    console.error("Error adding column:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
