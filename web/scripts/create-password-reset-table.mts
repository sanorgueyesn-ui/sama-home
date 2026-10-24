import "dotenv/config";
import "./lib/safe-env.mjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ⛔ SCRIPT NEUTRALISÉ (phase 0.4). DDL brut qui modifie le schéma hors du
// mécanisme de migrations Prisma (la table est déjà couverte par la migration
// 20261019110000_add_password_reset_token). Contenu conservé pour audit.
// Réactivation : NEUTRALIZED à false, base locale UNIQUEMENT, après autorisation.
const NEUTRALIZED = true as boolean;
if (NEUTRALIZED) {
  throw new Error("SCRIPT NEUTRALISÉ : create-password-reset-table.mts ne doit jamais être exécuté. Aucune connexion ouverte.");
}

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Creating 'PasswordResetToken' table if not exists...");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
    `);
    console.log("Table 'PasswordResetToken' successfully verified / created.");
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
