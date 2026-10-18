#!/usr/bin/env -S npx tsx
/**
 * TEST D'INTÉGRATION RÉEL contre le Bucket Railway (S3-compatible).
 *
 * ================================================================
 * NE PAS EXÉCUTER SANS APPROBATION EXPLICITE DE L'UTILISATEUR.
 * Ce script, contrairement à tous les scripts scripts/test-*.mts de ce
 * projet, effectue de VRAIS appels réseau (upload, lecture, suppression)
 * contre le Bucket réel désigné par l'environnement.
 * ================================================================
 *
 * Objectif : confirmer, avec un objet jetable et clairement identifié comme
 * tel, que la configuration S3 (endpoint, région, identifiants, style de
 * chemin) fonctionne réellement — sans jamais toucher à une donnée métier
 * (aucune table Prisma, aucun objet "logos/"/"logements/" réel).
 *
 * Usage (une fois approuvé) :
 *   npx tsx scripts/integration-test-bucket.mts \
 *     --confirm-bucket=<NOM_EXACT_DU_BUCKET_QUE_VOUS_ATTENDEZ> \
 *     --confirm-endpoint=<ENDPOINT_EXACT_QUE_VOUS_ATTENDEZ>
 *
 * Les deux arguments --confirm-* sont OBLIGATOIRES. Le script les compare
 * (sans jamais rien afficher d'eux ni des valeurs d'environnement) à ce que
 * AWS_S3_BUCKET_NAME/AWS_ENDPOINT_URL résolvent réellement, et refuse de
 * continuer en cas de désaccord. Cette double confirmation existe
 * précisément parce que l'assistant qui a écrit ce script n'a et ne doit
 * jamais avoir connaissance de ces valeurs réelles — seul l'opérateur qui
 * lance la commande peut les fournir, de mémoire, au moment de l'exécution.
 *
 * IMPORTANT — à ma connaissance (confirmé dans cette conversation), UN SEUL
 * Bucket Railway a été identifié ("reserved-toybox", attaché au service de
 * PRODUCTION "sama-home") : aucun Bucket distinct "de test" n'a été
 * mentionné ni confirmé comme existant séparément. Les arguments
 * --confirm-bucket/--confirm-endpoint ne présupposent donc PAS l'existence
 * d'un tel Bucket séparé — ils vous demandent seulement de reconfirmer
 * explicitement, au moment de lancer ce script, le Bucket/endpoint que VOUS
 * savez être celui chargé dans l'environnement, qu'il s'agisse ou non d'une
 * ressource dédiée aux tests. Si un Bucket de test séparé existe réellement
 * et que vous voulez l'utiliser à la place, il faudrait charger SES propres
 * variables dans l'environnement avant de lancer ce script — une décision
 * qui vous appartient entièrement, je ne gère ni ne choisis aucune valeur.
 *
 * Pourquoi ce script NE RÉUTILISE PAS src/lib/s3-client.ts : ce fichier
 * contient `import "server-only"`, qui lève systématiquement une exception
 * hors du runtime Next.js — confirmé empiriquement dans ce projet avec
 * src/lib/contract-pdf.tsx et src/lib/object-storage.ts, qui ont dû
 * explicitement RETIRER cette directive pour devenir exécutables via
 * `npx tsx` (voir leurs commentaires en tête de fichier). Reproduire ici,
 * en quelques lignes, exactement la même construction du client (mêmes 5
 * variables, même forcePathStyle) évite cette dépendance SANS modifier le
 * code applicatif existant, qui reste hors du périmètre de cette
 * préparation. Si la configuration de src/lib/s3-client.ts change un jour
 * (nouvelle option du client S3, etc.), ce script devra être mis à jour en
 * miroir — c'est un script de diagnostic ponctuel, pas un module partagé.
 *
 * Risques identifiés (API S3-compatible Railway) :
 * - `forcePathStyle: true` est un choix par défaut raisonnable pour un
 *   endpoint non-AWS, mais n'a jamais été vérifié contre ce Bucket réel —
 *   une erreur de connexion/résolution DNS à l'Étape 1 en serait le signe.
 * - Le nom exact de l'exception "objet introuvable" peut varier d'une
 *   implémentation S3-compatible à l'autre (AWS utilise "NotFound" pour
 *   HeadObject et "NoSuchKey" pour GetObject) : la détection ci-dessous
 *   accepte aussi un `$metadata.httpStatusCode === 404` en repli, plus
 *   robuste face à une implémentation qui nommerait son exception
 *   différemment.
 * - Aucune politique de retry/timeout personnalisée n'est configurée ici
 *   (comportement par défaut du SDK) — un Bucket lent ou temporairement
 *   indisponible provoquerait un échec signalé, jamais un blocage silencieux
 *   indéfini.
 *
 * Confidentialité des journaux (correction post-audit) — AUCUN message
 * d'erreur de ce script n'affiche jamais `error.message`/`String(error)`
 * brut : un texte d'erreur réseau/S3 peut contenir l'endpoint, le nom du
 * Bucket ou une autre valeur de configuration (ex. "getaddrinfo ENOTFOUND
 * <endpoint>"). Seuls apparaissent : un message fixe écrit par ce script
 * (jamais de valeur interpolée sensible), l'étape en cours (chaîne fixe,
 * voir `currentStep`), et au plus `error.name` — une étiquette de
 * classification courte du SDK (ex. "AccessDenied", "NotFound",
 * "TimeoutError"), jamais un texte libre susceptible de contenir une
 * valeur de configuration.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// Préfixe EXCLUSIVEMENT réservé à ce script — ne doit jamais coïncider avec
// les préfixes applicatifs réels ("logos/", "logements/", voir
// src/lib/image-upload.ts, generateImageObjectKey).
const TEST_PREFIX = "__sama_home_bucket_integration_test__";

// Plus petit PNG valide possible (1x1 pixel transparent) — octets fixes,
// connus et vérifiables par ce script lui-même, jamais lus depuis un
// fichier externe.
const TEST_PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49,
  0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/**
 * Correction M2 (audit) — levée au lieu d'un `process.exit(1)` immédiat :
 * son message est TOUJOURS une chaîne fixe, sans valeur interpolée
 * sensible (uniquement un nom de variable/d'argument), donc sûre à
 * afficher telle quelle par le gestionnaire au sommet de `main()`.
 */
class StartupAbortError extends Error {}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new StartupAbortError(`REFUS DE DÉMARRER : la variable "${name}" est absente de l'environnement.`);
  }
  return value;
}

function readRequiredArg(flag: string): string {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) {
    throw new StartupAbortError(`REFUS DE DÉMARRER : argument obligatoire manquant (${prefix}<valeur>).`);
  }
  return arg.slice(prefix.length);
}

function isNotFoundError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const status = (error as { $metadata?: { httpStatusCode?: number } } | undefined)?.$metadata?.httpStatusCode;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

/** Nom du type d'erreur uniquement — jamais error.message (voir en-tête). */
function errorKind(error: unknown): string {
  return error instanceof Error ? error.name : "inconnu";
}

async function main() {
  console.log("=== Étape 0 — Vérification de la configuration (aucun appel réseau encore) ===");
  const endpoint = readRequiredEnv("AWS_ENDPOINT_URL");
  const region = readRequiredEnv("AWS_DEFAULT_REGION");
  const accessKeyId = readRequiredEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = readRequiredEnv("AWS_SECRET_ACCESS_KEY");
  const bucket = readRequiredEnv("AWS_S3_BUCKET_NAME");
  console.log("  OK — les 5 variables requises sont présentes (valeurs jamais affichées).");

  const confirmBucket = readRequiredArg("confirm-bucket");
  const confirmEndpoint = readRequiredArg("confirm-endpoint");

  if (confirmBucket !== bucket) {
    console.error(
      "REFUS DE DÉMARRER : --confirm-bucket ne correspond pas à AWS_S3_BUCKET_NAME résolu depuis l'environnement.",
    );
    process.exitCode = 1;
    return;
  }
  if (confirmEndpoint !== endpoint) {
    console.error(
      "REFUS DE DÉMARRER : --confirm-endpoint ne correspond pas à AWS_ENDPOINT_URL résolu depuis l'environnement.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("  OK — Bucket et endpoint confirmés explicitement par l'opérateur, cohérents avec l'environnement.");

  const client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });
  const testKey = `${TEST_PREFIX}/${Date.now()}-${randomUUID()}.png`;
  console.log(`  OK — clé de test générée sous le préfixe réservé : ${testKey}`);

  console.log("\n=== Étape 1 — Vérification qu'aucun objet n'existe déjà à cette clé ===");
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: testKey }));
    console.error(
      "ÉCHEC : un objet existe déjà à cette clé générée aléatoirement — arrêt par précaution, aucun écrasement.",
    );
    process.exitCode = 1;
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      // Englobe volontairement les erreurs 403/réseau/authentification :
      // jamais interprétées comme "objet absent", toujours comme un échec
      // qui doit arrêter le script avant tout envoi.
      console.error(
        `ÉCHEC inattendu lors de la vérification préalable (HeadObject) — connexion, authentification ou permissions en cause (type d'erreur : ${errorKind(error)}).`,
      );
      process.exitCode = 1;
      return;
    }
    console.log("  OK — confirmé : aucun objet existant à cette clé.");
  }

  console.log("\n=== Étape 2 — Envoi de l'image PNG de test ===");
  let uploaded = false;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: testKey, Body: TEST_PNG_BYTES, ContentType: "image/png" }));
    uploaded = true;
    console.log("  OK — envoi réussi.");
  } catch (error) {
    // Correction post-audit — issue réellement AMBIGUË : le SDK a levé une
    // erreur côté client (réseau, timeout, réponse perdue...), mais le
    // Bucket a pu malgré tout enregistrer l'objet avant que la confirmation
    // ne revienne. On ne peut donc plus affirmer qu'aucun objet n'a été
    // créé — une tentative de nettoyage de SÉCURITÉ est systématiquement
    // effectuée sur `testKey` uniquement (cette constante, générée une
    // seule fois plus haut dans cette exécution, jamais recalculée —
    // collision avec une autre exécution cryptographiquement négligeable,
    // voir randomUUID()) : DeleteObject étant idempotent (une clé
    // réellement absente ne lève aucune erreur), cette tentative est sûre
    // dans tous les cas, que l'écriture ait ou non réellement abouti.
    console.error(`ÉCHEC de l'envoi — résultat incertain (type d'erreur : ${errorKind(error)}).`);
    console.log("Tentative de nettoyage de sécurité (résultat de l'envoi incertain)...");
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
      console.log("  OK — nettoyage de sécurité effectué (objet supprimé s'il avait été créé).");
    } catch (cleanupError) {
      // Jamais de valeur de configuration ni de message d'erreur brut —
      // uniquement le type d'erreur (voir errorKind()) et la clé de test
      // elle-même (pas un secret). L'erreur initiale ci-dessus n'est
      // jamais remplacée par celle-ci : les deux restent journalisées
      // séparément.
      console.error(
        `  ÉCHEC DU NETTOYAGE DE SÉCURITÉ — un objet résiduel est possible à la clé "${testKey}" (type d'erreur : ${errorKind(cleanupError)}).`,
      );
    }
    // Code de sortie non nul conservé même si le nettoyage réussit : l'envoi
    // lui-même reste un échec (résultat incertain), jamais un succès.
    process.exitCode = 1;
    return;
  }

  let currentStep = "Étape 3 — relecture et vérification du contenu";
  try {
    console.log(`\n=== ${currentStep} ===`);
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: testKey }));
    const body = result.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined;
    if (!body) throw new Error("Réponse GetObject sans corps lisible.");
    const readBack = await body.transformToByteArray();

    if (readBack.length !== TEST_PNG_BYTES.length || !readBack.every((b, i) => b === TEST_PNG_BYTES[i])) {
      throw new Error("Contenu relu différent de l'original.");
    }
    console.log(`  OK — contenu relu identique à l'original (${readBack.length} octets).`);

    currentStep = "Étape 4 — suppression de l'objet de test";
    console.log(`\n=== ${currentStep} (uniquement celui créé ci-dessus) ===`);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
    console.log("  OK — objet de test supprimé.");

    currentStep = "Étape 5 — vérification que l'objet n'existe plus";
    console.log(`\n=== ${currentStep} ===`);
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: testKey }));
      console.error("ÉCHEC : l'objet existe toujours après suppression.");
      process.exitCode = 1;
      return;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
      console.log("  OK — confirmé : l'objet n'existe plus.");
    }

    console.log("\nTOUTES LES ÉTAPES ONT RÉUSSI. Aucune donnée métier touchée. Aucun objet résiduel.");
  } catch (verificationError) {
    // La création (Étape 2) est confirmée réussie (uploaded === true) :
    // nettoyage de l'objet créé, SANS masquer l'erreur initiale — celle-ci
    // reste affichée distinctement, jamais remplacée par un succès trompeur
    // même si le nettoyage lui-même réussit. `currentStep` identifie
    // précisément où l'échec a eu lieu, sans jamais afficher le texte brut
    // de l'erreur (voir errorKind()).
    console.error(`\nÉCHEC durant : ${currentStep} (type d'erreur : ${errorKind(verificationError)}).`);
    if (uploaded) {
      console.log("Tentative de nettoyage de l'objet créé par cette exécution avant d'arrêter...");
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
        console.log("  OK — nettoyage réussi : l'objet créé par cette exécution a été supprimé.");
      } catch (cleanupError) {
        console.error(
          `  ÉCHEC DU NETTOYAGE — objet potentiellement orphelin à la clé "${testKey}" (type d'erreur : ${errorKind(cleanupError)}).`,
        );
      }
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // Correction M2 (audit) — plus aucun `process.exit()` prématuré dans ce
  // fichier : seul ce gestionnaire, au sommet, peut encore définir
  // `process.exitCode` après une erreur non interceptée plus bas, ce qui
  // laisse toujours Node vidanger stdout/stderr avant la fin naturelle du
  // processus.
  if (error instanceof StartupAbortError) {
    console.error(error.message); // message fixe, sans valeur sensible — voir la classe ci-dessus
  } else {
    console.error(`ÉCHEC INATTENDU, NON INTERCEPTÉ (type d'erreur : ${errorKind(error)}).`);
  }
  process.exitCode = 1;
});
