import { randomUUID } from "node:crypto";

/**
 * Lot "Téléversement durable des images" — validation PURE d'un fichier
 * image, indépendante du backend de stockage choisi (aucune dépendance S3 /
 * Prisma / server-only ici : testable isolément, même esprit que
 * src/lib/duration.ts, src/lib/transfer-frequency.ts, src/lib/whatsapp.ts).
 *
 * Écrit AVANT que le service de stockage objet Railway soit confirmé
 * (service en cours de vérification côté utilisateur) : ce module couvre
 * exactement les exigences qui ne dépendent PAS du backend — type réel du
 * contenu, taille, génération de clé aléatoire — pour ne pas rester bloqué
 * sur la partie encore inconnue. Le client S3 lui-même (upload/delete/accès
 * sécurisé en lecture) sera ajouté dans un module séparé une fois les noms
 * réels des variables Railway confirmés (jamais inventés).
 */

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/**
 * Limite de taille — AUCUNE valeur n'était déjà fixée ailleurs dans le
 * projet pour un envoi de fichier (V1 n'avait que des champs URL). 5 Mo est
 * une décision prise ICI, documentée plutôt que silencieusement choisie
 * (même esprit que `NEW_PASSWORD_MIN` dans src/lib/definitions.ts) :
 * largement suffisant pour un logo ou une photo de logement affichés en
 * vignette/PDF, sans autoriser un fichier démesuré. Ajustable si vous
 * voulez une autre limite.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Détecte le type réel d'une image à partir de ses premiers octets (signature
 * binaire), jamais à partir de l'extension du nom de fichier ni du
 * `Content-Type` déclaré par le navigateur (les deux sont falsifiables côté
 * client — exigence explicite du lot). Ne reconnaît QUE les trois formats
 * explicitement pris en charge ; tout le reste retourne `null`.
 */
export function detectImageMimeType(bytes: Uint8Array): AllowedImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageValidationResult =
  | { ok: true; mimeType: AllowedImageMimeType }
  | { ok: false; reason: string };

function maxSizeErrorMessage(): string {
  const maxMb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
  return `Le fichier dépasse la taille maximale autorisée (${maxMb} Mo).`;
}

/** Validation complète (taille + type réel) — jamais l'extension/le Content-Type déclaré. */
export function validateImageUpload(bytes: Uint8Array): ImageValidationResult {
  if (bytes.length === 0) {
    return { ok: false, reason: "Le fichier est vide." };
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: maxSizeErrorMessage() };
  }
  const mimeType = detectImageMimeType(bytes);
  if (!mimeType) {
    return { ok: false, reason: "Format d'image non pris en charge (JPEG, PNG ou WebP uniquement)." };
  }
  return { ok: true, mimeType };
}

/**
 * Clé d'objet aléatoire — JAMAIS dérivée du nom de fichier fourni par
 * l'utilisateur (qui peut contenir des caractères dangereux, des chemins,
 * ou simplement collisionner). `prefix` permet de séparer logos et photos
 * de logements dans le bucket (ex. "logos", "logements") sans dépendre
 * d'une structure de dossiers imposée par le client.
 *
 * Phase 3D / Lot D11a — `establishmentId` optionnel, inséré comme segment
 * de chemin SOUS le préfixe existant (`logements/<establishmentId>/<uuid>.
 * ext`), jamais fusionné dans la constante de préfixe elle-même. Changement
 * strictement additif : un appelant qui ne le fournit pas (le flux logos,
 * `settings.ts`, non touché dans ce lot) obtient exactement l'ancien format
 * `prefix/<uuid>.ext` — aucune régression. Aucune clé déjà enregistrée en
 * base n'est reconstruite à partir de cette fonction (confirmé par l'audit
 * D11 : lecture/présignature/suppression utilisent toujours la valeur déjà
 * stockée telle quelle) — ce changement n'affecte donc que les PROCHAINS
 * téléversements, jamais l'existant.
 */
export function generateImageObjectKey(
  prefix: string,
  mimeType: AllowedImageMimeType,
  establishmentId?: string,
): string {
  const scopedPrefix = establishmentId ? `${prefix}/${establishmentId}` : prefix;
  return `${scopedPrefix}/${randomUUID()}.${EXTENSION_BY_MIME_TYPE[mimeType]}`;
}

export type ReadImageUploadResult =
  | { key: string; bytes: Uint8Array; contentType: AllowedImageMimeType }
  | { error: string }
  | null;

/**
 * Point d'entrée UNIQUE pour lire un fichier image soumis via `FormData`,
 * réutilisé par `src/app/actions/properties.ts` (champ "photo") ET
 * `src/app/actions/settings.ts` (champ "logo") — centralise exactement la
 * logique que le brief demande de ne jamais dupliquer entre les deux
 * actions. `File`/`FormData` sont des API web standard disponibles
 * nativement dans le runtime Node des Server Actions (et dans un script
 * `node:test`/`tsx` autonome, sans aucun framework de mock) : ce module
 * reste donc testable isolément, même convention que le reste du fichier.
 *
 * Retourne `null` quand AUCUN fichier n'a été sélectionné (cas normal à
 * chaque édition : la photo/le logo n'est pas obligatoirement remplacé) —
 * jamais confondu avec `{ error }` (fichier fourni mais invalide).
 */
export async function readImageUploadFromFormData(
  formData: FormData,
  fieldName: string,
  keyPrefix: string,
  establishmentId?: string,
): Promise<ReadImageUploadResult> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;

  // Correction H1/L1 (audit "Téléversement durable des images") — `file.size`
  // est contrôlé AVANT `file.arrayBuffer()` : c'est la taille réelle du blob
  // telle que calculée par le runtime (pas une valeur déclarée par un champ
  // de requête falsifiable), donc une vérification fiable qui évite de
  // bufferiser en mémoire un fichier déjà trop volumineux.
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: maxSizeErrorMessage() };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImageUpload(bytes);
  if (!validation.ok) return { error: validation.reason };

  return {
    bytes,
    contentType: validation.mimeType,
    key: generateImageObjectKey(keyPrefix, validation.mimeType, establishmentId),
  };
}
