import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
