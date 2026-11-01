/**
 * Socle multi-espaces, lot C — données du test navigateur (base de test locale UNIQUEMENT).
 * Crée : un compte à DEUX espaces actifs (Hôtel + Agence) et un compte à UN seul espace.
 *
 * Usage : DATABASE_URL=<base de test locale> npx tsx --conditions=react-server scripts/__lot-c-browser-seed.mts
 * Garde : refuse toute base dont le nom ne commence pas par `samahome_test_` ou dont l'hôte
 * n'est pas local. Le mot de passe de test n'est jamais affiché.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL doit être passée explicitement.");
const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !dbName.startsWith("samahome_test_")) {
  throw new Error("REFUSÉ : base locale samahome_test_* uniquement.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const passwordHash = await hashPassword("LotCBrowser!2026");
const stamp = Date.now().toString(36);

async function space(name: string, businessMode: "HOTEL" | "REAL_ESTATE" | "RESIDENCE") {
  const establishment = await prisma.establishment.create({ data: { name, status: "ACTIVE", businessMode } });
  await prisma.subscription.create({
    data: { establishmentId: establishment.id, trialStartedAt: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
  });
  return establishment;
}

const hotel = await space(`LotC Hôtel Test ${stamp}`, "HOTEL");
const agency = await space(`LotC Agence Test ${stamp}`, "REAL_ESTATE");
const solo = await space(`LotC Résidence Solo ${stamp}`, "RESIDENCE");

const multi = await prisma.user.create({
  data: { username: `lotc-multi-${stamp}`, passwordHash, name: "Compte Deux Espaces", role: "ADMIN", establishmentId: hotel.id },
});
await prisma.membership.createMany({
  data: [
    { userId: multi.id, establishmentId: hotel.id, role: "ADMIN" },
    { userId: multi.id, establishmentId: agency.id, role: "ADMIN" },
  ],
});
const single = await prisma.user.create({
  data: { username: `lotc-solo-${stamp}`, passwordHash, name: "Compte Un Espace", role: "ADMIN", establishmentId: solo.id },
});
await prisma.membership.create({ data: { userId: single.id, establishmentId: solo.id, role: "ADMIN" } });

console.log(JSON.stringify({ multi: multi.username, single: single.username, hotel: hotel.name, agency: agency.name, solo: solo.name }, null, 2));
await prisma.$disconnect();
