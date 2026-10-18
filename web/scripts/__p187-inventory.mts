import "dotenv/config";
import { Client } from "pg";

const EXPECTED_DB = "samahome_test_playwright_p114";
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.pathname.replace(/^\//, "") !== EXPECTED_DB) throw new Error("cible inattendue");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const estA = (await client.query(`SELECT id FROM "Establishment" WHERE name = 'P118 Hotel Actif'`)).rows[0]?.id;
const estB = (await client.query(`SELECT id FROM "Establishment" WHERE name = 'P118 Hotel Actif 2'`)).rows[0]?.id;
console.log("Établissement A:", estA);
console.log("Établissement B:", estB);

for (const [label, est] of [["A", estA], ["B", estB]] as const) {
  console.log(`\n-- Données de l'établissement ${label} --`);
  console.log("Clients:", (await client.query(`SELECT id, name FROM "Client" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Properties:", (await client.query(`SELECT id, name FROM "Property" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Tariffs:", (await client.query(`SELECT id, label FROM "Tariff" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Reservations:", (await client.query(`SELECT id, status FROM "Reservation" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Rentals:", (await client.query(`SELECT id, status FROM "Rental" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("ExpenseCategories:", (await client.query(`SELECT id, name FROM "ExpenseCategory" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Expenses:", (await client.query(`SELECT id FROM "Expense" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("BankAccounts:", (await client.query(`SELECT id, label FROM "BankAccount" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("TransferSchedules:", (await client.query(`SELECT id FROM "TransferSchedule" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
  console.log("Users:", (await client.query(`SELECT id, username FROM "User" WHERE "establishmentId" = $1 LIMIT 3`, [est])).rows);
}

await client.end();
