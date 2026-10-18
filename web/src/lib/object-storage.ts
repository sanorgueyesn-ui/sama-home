// Pas de `import "server-only"` ici : ce module ne lit jamais process.env ni
// aucun secret directement (contrairement à src/lib/s3-client.ts, qui lui
// reste server-only) — `client`/`bucket` sont de simples paramètres. Même
// distinction que src/lib/contract-pdf.tsx (pur/paramétré, testable par
// scripts/test-object-storage.mts via `npx tsx`, que "server-only"
// bloquerait systématiquement hors runtime Next.js).
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Lot "Téléversement durable des images" — opérations sur le Bucket Railway.
 *
 * `client`/`bucket` sont des PARAMÈTRES explicites (jamais importés
 * directement depuis src/lib/s3-client.ts à l'intérieur de ces fonctions) —
 * même convention que `findAvailabilityConflict(prisma | tx, ...)`
 * (src/lib/availability.ts) et `getRentalPaymentSummary(client, ...)`
 * (src/lib/payment-summary.ts) : les appelants réels passent
 * `getS3Client()`/`getBucketName()` (src/lib/s3-client.ts, lecture
 * paresseuse), les tests passent un faux client minimal
 * (`{ send: async (cmd) => ... }`) — aucune dépendance de mock n'est
 * installée dans ce projet, donc aucun framework de mock n'est nécessaire.
 *
 * Deux formats de valeur stockée en base (`Settings.logoUrl`/`Property.photo`,
 * colonnes réutilisées SANS migration) coexistent délibérément :
 * - une clé d'objet du bucket (ex. "logos/<uuid>.png", générée par
 *   generateImageObjectKey — src/lib/image-upload.ts) : nouveau mode ;
 * - un lien http(s) collé directement (ancien mode "V1", avant ce lot) :
 *   conservé tel quel pour ne JAMAIS casser une donnée déjà enregistrée
 *   (aucune migration de données n'a été demandée ni exécutée).
 */

export type S3ClientLike = Pick<S3Client, "send">;

/** URL présignée courte durée — jamais stockée en base (seule la clé l'est). */
const DISPLAY_URL_EXPIRY_SECONDS = 15 * 60;

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "169.254.169.254" ||
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isExternalUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export async function uploadImageObject(
  client: S3ClientLike,
  bucket: string,
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
}

/**
 * Jamais bloquante pour l'appelant (un échec de nettoyage secondaire ne doit
 * jamais faire échouer l'opération principale déjà confirmée en base) —
 * mais jamais silencieuse non plus (correction M2, audit "Téléversement
 * durable des images") : DeleteObject est idempotent par spécification S3
 * (supprimer une clé déjà absente ne lève PAS d'erreur, contrairement à ce
 * que l'ancien commentaire de cette fonction supposait) — toute exception
 * ici est donc TOUJOURS un échec réel (réseau, autorisation, configuration
 * du bucket), jamais un cas bénin, et est journalisée pour que les objets
 * orphelins restent détectables au lieu de disparaître sans trace. Jamais de
 * secret journalisé : ni identifiants AWS, ni URL présignée (cette fonction
 * n'en construit aucune) — seuls le nom/message de l'erreur et la clé
 * d'objet elle-même (qui n'est pas un secret, juste un chemin) apparaissent.
 */
export async function deleteImageObject(client: S3ClientLike, bucket: string, key: string | null | undefined): Promise<void> {
  if (!key || isExternalUrl(key)) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`deleteImageObject() — échec réel de la suppression de l'objet "${key}" (orphelin probable) : ${name}.`);
  }
}

/** Pour un <img src="..."> — jamais écrite en base, recalculée à chaque rendu. */
export async function resolveImageDisplayUrl(
  client: S3ClientLike,
  bucket: string,
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (isExternalUrl(stored)) return stored;
  try {
    return await getSignedUrl(client as S3Client, new GetObjectCommand({ Bucket: bucket, Key: stored }), {
      expiresIn: DISPLAY_URL_EXPIRY_SECONDS,
    });
  } catch {
    // Objet introuvable/inaccessible — jamais une page cassée, simplement
    // pas d'image (le composant appelant retombe sur son repli visuel).
    return null;
  }
}

// `Buffer` précisément (pas `Uint8Array`) : @react-pdf/renderer typpe son
// prop `Image.src.data` comme `Buffer` — un Uint8Array générique, bien que
// compatible à l'exécution, échoue le typecheck.
export type PdfImageSource = { data: Buffer; format: "png" | "jpg" };

function guessPdfFormat(keyOrUrl: string): "png" | "jpg" | null {
  const lower = keyOrUrl.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  // .webp (ou tout autre format non reconnu) : @react-pdf/renderer ne sait
  // intégrer que du PNG/JPEG en données brutes (le format PDF n'a pas
  // d'encodeur WebP natif, et aucune dépendance de transcodage d'image
  // n'a été ajoutée pour ce lot — hors périmètre demandé). Documenté dans
  // le rapport : un logo WebP s'affiche normalement sur le web, mais est
  // omis du contrat PDF.
  return null;
}

/**
 * Pour le contrat PDF — octets BRUTS, jamais une URL (évite toute
 * dépendance réseau/expiration pendant le rendu, exigence explicite du lot).
 * Ne lève jamais : un logo absent/inaccessible/au format non pris en charge
 * par le PDF retourne simplement `null`, le contrat se génère quand même
 * (exigence explicite : "ne pas casser le contrat").
 */
export async function resolveImagePdfSource(
  client: S3ClientLike,
  bucket: string,
  stored: string | null | undefined,
): Promise<PdfImageSource | null> {
  if (!stored) return null;
  const format = guessPdfFormat(stored);
  if (!format) return null;

  try {
        if (isExternalUrl(stored)) {
      if (!isSafeExternalUrl(stored)) return null;
      const response = await fetch(stored, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) return null;
      return { data: Buffer.from(await response.arrayBuffer()), format };
    }
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: stored }));
    const body = result.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined;
    if (!body) return null;
    return { data: Buffer.from(await body.transformToByteArray()), format };
  } catch {
    return null;
  }
}
