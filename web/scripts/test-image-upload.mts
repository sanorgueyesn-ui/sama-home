#!/usr/bin/env -S npx tsx
/**
 * Tests ciblés pour la validation d'image (lot "Téléversement durable des
 * images"). Mêmes conventions que scripts/test-whatsapp-link.mts :
 * `node:assert/strict`, fonctions pures, aucune base de données, aucun
 * accès réseau/S3 (couvre les exigences #2 et #3 du Bloc 7 de la mission —
 * la validation réelle du type de fichier et de la taille maximale —
 * indépendamment du backend de stockage, pas encore confirmé).
 *
 * Usage : npx tsx scripts/test-image-upload.mts
 */
import assert from "node:assert/strict";
import {
  detectImageMimeType,
  validateImageUpload,
  generateImageObjectKey,
  readImageUploadFromFormData,
  MAX_IMAGE_BYTES,
} from "../src/lib/image-upload";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

// Signatures binaires minimales mais réelles (pas des images complètes, juste l'en-tête vérifié).
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP_HEADER = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const GIF_HEADER = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a — non pris en charge
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-" — pas une image

console.log("=== Cas 1 — Détection du type réel par signature binaire ===");
{
  check("JPEG détecté", () => assert.equal(detectImageMimeType(JPEG_HEADER), "image/jpeg"));
  check("PNG détecté", () => assert.equal(detectImageMimeType(PNG_HEADER), "image/png"));
  check("WebP détecté", () => assert.equal(detectImageMimeType(WEBP_HEADER), "image/webp"));
  check("GIF -> null (non pris en charge)", () => assert.equal(detectImageMimeType(GIF_HEADER), null));
  check("PDF -> null (pas une image)", () => assert.equal(detectImageMimeType(PDF_HEADER), null));
}

console.log("=== Cas 2 — Un fichier renommé en .jpg mais dont le contenu est un PDF est refusé ===");
{
  // Simule exactement l'attaque visée par l'exigence "vérifier le type réel
  // du contenu, pas seulement l'extension" : octets réels = PDF.
  const result = validateImageUpload(PDF_HEADER);
  check("ok=false", () => assert.equal(result.ok, false));
  check("raison explicite", () => assert.ok(!result.ok && result.reason.includes("non pris en charge")));
}

console.log("=== Cas 3 — Image valide (PNG) acceptée ===");
{
  const result = validateImageUpload(PNG_HEADER);
  check("ok=true", () => assert.equal(result.ok, true));
  check("mimeType=image/png", () => assert.ok(result.ok && result.mimeType === "image/png"));
}

console.log("=== Cas 4 — Fichier trop volumineux refusé (> limite) ===");
{
  const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
  big.set(PNG_HEADER); // en-tête PNG valide, mais taille dépassée
  const result = validateImageUpload(big);
  check("ok=false", () => assert.equal(result.ok, false));
  check("raison mentionne la taille", () => assert.ok(!result.ok && result.reason.includes("Mo")));
}

console.log("=== Cas 5 — Fichier à la limite exacte accepté ===");
{
  const exact = new Uint8Array(MAX_IMAGE_BYTES);
  exact.set(PNG_HEADER);
  const result = validateImageUpload(exact);
  check("ok=true (limite exacte incluse)", () => assert.equal(result.ok, true));
}

console.log("=== Cas 6 — Fichier vide refusé ===");
{
  const result = validateImageUpload(new Uint8Array(0));
  check("ok=false", () => assert.equal(result.ok, false));
}

console.log("=== Cas 7 — Clé d'objet aléatoire : jamais dérivée d'un nom fourni, extension correcte ===");
{
  const key1 = generateImageObjectKey("logos", "image/jpeg");
  const key2 = generateImageObjectKey("logos", "image/jpeg");
  check("préfixe respecté", () => assert.ok(key1.startsWith("logos/")));
  check("extension .jpg", () => assert.ok(key1.endsWith(".jpg")));
  check("deux appels -> deux clés distinctes (aléatoire réel)", () => assert.notEqual(key1, key2));

  const pngKey = generateImageObjectKey("logements", "image/png");
  check("préfixe logements + extension .png", () => assert.ok(pngKey.startsWith("logements/") && pngKey.endsWith(".png")));
}

console.log("=== Cas 8 — readImageUploadFromFormData : point d'entrée réellement partagé par les deux actions ===");
{
  // `File`/`FormData` sont des API web standard disponibles nativement dans
  // Node 20+ (confirmé par cette exécution réelle, sans import) — aucun
  // framework de test/mock nécessaire pour simuler un vrai envoi multipart.
  async function check8(label: string, fn: () => Promise<void>) {
    await fn();
    passed++;
    console.log(`  ✓ ${label}`);
  }

  await check8("aucun fichier sélectionné -> null (pas une erreur)", async () => {
    const fd = new FormData();
    const result = await readImageUploadFromFormData(fd, "photo", "logements");
    assert.equal(result, null);
  });

  await check8("fichier valide (PNG) -> clé + octets + type corrects", async () => {
    const fd = new FormData();
    fd.set("photo", new File([PNG_HEADER], "mon-fichier-original.png", { type: "image/png" }));
    const result = await readImageUploadFromFormData(fd, "photo", "logements");
    assert.ok(result && !("error" in result));
    assert.ok(result.key.startsWith("logements/") && result.key.endsWith(".png"));
    assert.equal(result.contentType, "image/png");
    assert.deepEqual(Array.from(result.bytes), Array.from(PNG_HEADER));
  });

  await check8("fichier dont le CONTENU est un PDF, même nommé .png -> refusé (type réel, jamais l'extension)", async () => {
    const fd = new FormData();
    fd.set("photo", new File([PDF_HEADER], "deguise.png", { type: "image/png" })); // extension ET Content-Type déclarés mentent
    const result = await readImageUploadFromFormData(fd, "photo", "logements");
    assert.ok(result && "error" in result);
  });

  await check8("champ nommé différemment ('logo') -> lu indépendamment de 'photo'", async () => {
    const fd = new FormData();
    fd.set("logo", new File([PNG_HEADER], "logo.png", { type: "image/png" }));
    const asPhoto = await readImageUploadFromFormData(fd, "photo", "logements");
    const asLogo = await readImageUploadFromFormData(fd, "logo", "logos");
    assert.equal(asPhoto, null);
    assert.ok(asLogo && !("error" in asLogo) && asLogo.key.startsWith("logos/"));
  });

  console.log("=== Cas 9 — Correction H1/L1 : file.size refusé AVANT lecture du contenu ===");
  await check8("fichier dont file.size dépasse MAX_IMAGE_BYTES -> refusé avec le message de taille", async () => {
    const oversized = new Uint8Array(MAX_IMAGE_BYTES + 1);
    oversized.set(PNG_HEADER); // en-tête PNG valide : seule la TAILLE doit être le motif de refus ici
    const fd = new FormData();
    fd.set("photo", new File([oversized], "trop-gros.png", { type: "image/png" }));
    const result = await readImageUploadFromFormData(fd, "photo", "logements");
    assert.ok(result && "error" in result);
    assert.ok(result.error.includes("Mo"));
  });
}

console.log(`\n${passed} assertions réussies. Aucun échec.`);
