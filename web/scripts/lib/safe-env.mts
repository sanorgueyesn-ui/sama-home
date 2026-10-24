/**
 * Import à effet de bord, à placer JUSTE APRÈS `import "dotenv/config"` dans
 * tout script qui lit ou écrit la base :
 *
 *   import "dotenv/config";
 *   import "./lib/safe-env.mjs";
 *
 * Les imports ES s'exécutent dans l'ordre : ce module s'exécute donc avant
 * tout code du script (et avant la moindre connexion). Il :
 *   1. charge `.env.development.local` PAR-DESSUS `.env` (les valeurs de
 *      développement l'emportent, y compris les valeurs inertes S3/SMTP/OAuth) ;
 *   2. refuse (UnsafeTargetError) toute cible qui n'est pas une base locale
 *      explicitement autorisée — voir src/lib/env-guard.ts.
 *
 * Le contenu d'aucune variable n'est affiché : seul "hôte:port" l'est.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { assertSafeDevelopmentTarget } from "../../src/lib/env-guard";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
config({ path: path.join(webRoot, ".env.development.local"), override: true, quiet: true });

const { hostPort } = assertSafeDevelopmentTarget(process.env, "Script de développement");
console.log(`[garde] Cible locale autorisée : ${hostPort}`);
