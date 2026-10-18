/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    const result = await client.query(
      "SELECT current_database() AS db, current_setting('server_version') AS version"
    );

    console.log("Connexion PostgreSQL réussie.");
    console.log("Base :", result.rows[0].db);
    console.log("Version :", result.rows[0].version);
  } catch (error) {
    console.log("Connexion échouée :", error.code || error.name);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();

