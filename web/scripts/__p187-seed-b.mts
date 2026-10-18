import "dotenv/config";
import { Client } from "pg";

const EXPECTED_DB = "samahome_test_playwright_p114";
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.pathname.replace(/^\//, "") !== EXPECTED_DB) throw new Error("cible inattendue");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const estB = "cmv9e0eyr000czkuf4kwmnvio"; // P118 Hotel Actif 2

function cuid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

const propB = cuid("propb");
await client.query(
  `INSERT INTO "Property" (id, name, type, capacity, active, "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, 'P187 Logement B', 'ROOM', 2, true, $2, now(), now())`,
  [propB, estB],
);

const tariffB = cuid("tarb");
await client.query(
  `INSERT INTO "Tariff" (id, "propertyId", label, type, "durationValue", "durationUnit", amount, active, "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, $2, 'P187 Tarif B', 'NUIT', 1, 'NIGHT', 10000, true, $3, now(), now())`,
  [tariffB, propB, estB],
);

const clientB = cuid("clib");
await client.query(
  `INSERT INTO "Client" (id, name, phone, "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, 'P187 Client B', '780000001', $2, now(), now())`,
  [clientB, estB],
);

const resB = cuid("resb");
await client.query(
  `INSERT INTO "Reservation" (id, "clientId", "propertyId", "tariffId", date, "arrivalTime", "departureTime", "durationValue", "durationUnit", amount, deposit, status, "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, $2, $3, $4, now(), now(), now() + interval '1 day', 1, 'NIGHT', 10000, 0, 'CONFIRMED', $5, now(), now())`,
  [resB, clientB, propB, tariffB, estB],
);

const userBId = (await client.query(`SELECT id FROM "User" WHERE username = 'p118-admin-actif2'`)).rows[0].id;
const rentB = cuid("rentb");
await client.query(
  `INSERT INTO "Rental" (id, "clientId", "propertyId", "tariffId", "arrivalAt", "plannedDepartureAt", "durationValue", "durationUnit", amount, deposit, status, "registeredByUserId", "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, $2, $3, $4, now(), now() + interval '1 day', 1, 'NIGHT', 10000, 0, 'ACTIVE', $5, $6, now(), now())`,
  [rentB, clientB, propB, tariffB, userBId, estB],
);

const catB = cuid("catb");
await client.query(
  `INSERT INTO "ExpenseCategory" (id, name, active, position, "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, 'P187 Categorie B', true, 0, $2, now(), now())`,
  [catB, estB],
);

const expB = cuid("expb");
await client.query(
  `INSERT INTO "Expense" (id, "categoryId", "categoryNameSnapshot", amount, method, "paidAt", "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, $2, 'P187 Categorie B', 5000, 'CASH', now(), $3, now(), now())`,
  [expB, catB, estB],
);

const bankB = cuid("bankb");
await client.query(
  `INSERT INTO "BankAccount" (id, label, "bankName", active, "createdByUserId", "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, 'P187 Compte B', 'Banque B', true, $2, $3, now(), now())`,
  [bankB, userBId, estB],
);

const tsB = cuid("tsb");
await client.query(
  `INSERT INTO "TransferSchedule" (id, "bankAccountId", frequency, "amountType", "fixedAmount", "nextRunAt", active, "createdByUserId", "establishmentId", "createdAt", "updatedAt")
   VALUES ($1, $2, 'WEEKLY', 'FIXED', 5000, now() + interval '7 day', true, $3, $4, now(), now())`,
  [tsB, bankB, userBId, estB],
);

console.log(JSON.stringify({ propB, tariffB, clientB, resB, rentB, catB, expB, bankB, tsB }, null, 2));
await client.end();
