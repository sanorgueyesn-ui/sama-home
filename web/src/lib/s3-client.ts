import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Lot "Téléversement durable des images" — client du Bucket Railway
 * (S3-compatible), noms de variables confirmés par l'utilisateur depuis le
 * tableau de bord Railway (service "reserved-toybox"), jamais inventés :
 * AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME, AWS_DEFAULT_REGION,
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY. Valeurs jamais journalisées —
 * seule leur PRÉSENCE est vérifiée, jamais leur contenu affiché.
 *
 * `forcePathStyle: true` — les fournisseurs S3-compatibles non-AWS (Railway,
 * MinIO, R2, Backblaze…) exposent presque toujours leur bucket en style
 * "chemin" (endpoint/bucket/clé) plutôt qu'en style "virtual-hosted" propre
 * à AWS S3 lui-même — réglage standard pour tout endpoint S3-compatible
 * non-AWS, pas une variable à deviner.
 *
 * LECTURE PARESSEUSE (getS3Client()/getBucketName(), jamais une `const`
 * évaluée au chargement du module) : constaté pendant ce lot — `next build`
 * exécute le graphe de modules serveur pour collecter les métadonnées de
 * route, y compris pour des pages n'ayant AUCUN rapport avec les images
 * (ex. /clients/[id]). Une vérification fail-fast au chargement du module
 * (comme src/lib/prisma.ts pour DATABASE_URL) ferait alors échouer la
 * compilation de TOUT le projet dès que ces 5 variables sont absentes de
 * l'environnement de build — même quand aucune fonctionnalité liée au
 * bucket n'est réellement sollicitée. Reporter la vérification au premier
 * usage réel limite l'échec aux seules fonctionnalités qui en dépendent
 * (Paramètres > logo, Logements > photo, contrat PDF), sans fragiliser le
 * reste de l'application.
 */
function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Voir le service Bucket Railway ("reserved-toybox").`);
  }
  return value;
}

let cachedClient: S3Client | undefined;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = readRequiredEnv("AWS_ENDPOINT_URL");
  const region = readRequiredEnv("AWS_DEFAULT_REGION");
  const accessKeyId = readRequiredEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = readRequiredEnv("AWS_SECRET_ACCESS_KEY");

  cachedClient = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return cachedClient;
}

export function getBucketName(): string {
  return readRequiredEnv("AWS_S3_BUCKET_NAME");
}
