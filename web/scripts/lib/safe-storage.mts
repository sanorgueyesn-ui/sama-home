/**
 * Import à effet de bord pour tout script qui ÉCRIT dans un stockage objet (S3) :
 *
 *   import "dotenv/config";
 *   import "./lib/safe-env.mjs";
 *   import "./lib/safe-storage.mjs";
 *
 * Refuse de continuer si AWS_ENDPOINT_URL n'est pas explicitement un émulateur
 * LOCAL (127.0.0.1 / localhost). Un endpoint absent (le SDK viserait le service
 * AWS réel) ou distant (le bucket réel) est refusé avant tout appel réseau.
 */
import { assertLocalObjectStorage } from "../../src/lib/env-guard";

assertLocalObjectStorage(process.env, "Script écrivant dans le stockage objet");
