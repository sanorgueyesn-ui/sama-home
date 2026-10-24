/**
 * Migration d'une base de TEST locale — chemin sûr : garde de cible locale +
 * marqueur de base de test vérifiés AVANT prisma migrate deploy.
 *
 * Usage : npx tsx scripts/migrate-local.mts [--apply]
 * Sans --apply : vérifie la cible et le marqueur, n'exécute rien.
 *
 * Note : un `prisma migrate deploy` lancé directement est aussi protégé
 * (prisma7.config.ts vérifie la cible locale ET le marqueur) ; ce script reste
 * le chemin recommandé, avec une vérification préalable sans --apply.
 */
import "dotenv/config";
import "./lib/safe-env.mjs";
import { spawnSync } from "node:child_process";
import { assertTestDatabaseMarker } from "./lib/db-marker.mjs";

await assertTestDatabaseMarker(process.env.DATABASE_URL, "migration de test");
console.log("[migrate-local] Cible locale et marqueur de test vérifiés.");

if (!process.argv.includes("--apply")) {
  console.log("[migrate-local] Vérification seule : relancer avec --apply pour migrer.");
} else {
  const result = spawnSync("npx prisma migrate deploy", { stdio: "inherit", shell: true, env: process.env });
  process.exit(result.status ?? 1);
}
