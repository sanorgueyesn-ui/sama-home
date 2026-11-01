/**
 * Socle multi-espaces, lot E — vérification SQL réelle de `OtpVerification.businessMode`
 * (base de test locale UNIQUEMENT). Usage : DATABASE_URL=<base de test> npx tsx scripts/__lot-e-otp-mode-db-check.mts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL doit être passée explicitement.");
const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !dbName.startsWith("samahome_test_")) {
  throw new Error("REFUSÉ : base locale samahome_test_* uniquement.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const base = {
  code: "123456",
  establishmentName: "Lot E",
  managerName: "Test",
  passwordHash: "x",
  expiresAt: new Date(Date.now() + 60_000),
};
const email = `lot-e-${Date.now().toString(36)}@exemple.invalid`;

try {
  const byDefault = await prisma.otpVerification.create({ data: { ...base, email } });
  assert.equal(byDefault.businessMode, "RESIDENCE");
  const agency = await prisma.otpVerification.create({ data: { ...base, email, businessMode: "REAL_ESTATE" } });
  const reread = await prisma.otpVerification.findUniqueOrThrow({ where: { id: agency.id } });
  assert.equal(reread.businessMode, "REAL_ESTATE");
  await assert.rejects(
    prisma.$executeRawUnsafe(`UPDATE "OtpVerification" SET "businessMode" = 'ADMIN' WHERE id = '${agency.id}'`),
  );
  console.log("lot E : 4 vérifications SQL réelles OK (défaut, valeur choisie, relecture, valeur hors liste refusée)");
} finally {
  await prisma.otpVerification.deleteMany({ where: { email } });
  await prisma.$disconnect();
}
