#!/usr/bin/env -S npx tsx
/**
 * Tests du lot "Téléversement durable des images" pour src/lib/object-storage.ts.
 *
 * AUCUNE écriture réelle dans le Bucket Railway : `client`/`bucket` sont des
 * paramètres explicites de chaque fonction (voir le commentaire en tête
 * d'object-storage.ts), ce qui permet de passer ici soit un faux client
 * minimal (`{ send: async (cmd) => ... }`, pour upload/delete/PDF — jamais
 * de connexion réseau), soit un vrai `S3Client` construit avec des
 * identifiants FICTIFS et un endpoint `*.invalid` (pour `resolveImageDisplayUrl` :
 * la présignature AWS SigV4 est un calcul cryptographique local, qui ne se
 * connecte jamais réellement au réseau — c'est la seule façon de produire
 * une vraie URL présignée sans toucher le bucket réel). Aucun framework de
 * mock n'est installé dans ce projet (confirmé dans package.json) ; ces
 * deux techniques remplissent exactement le même rôle sans en ajouter un.
 *
 * Usage : npx tsx scripts/test-object-storage.mts
 */
import assert from "node:assert/strict";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  uploadImageObject,
  deleteImageObject,
  resolveImageDisplayUrl,
  resolveImagePdfSource,
  type S3ClientLike,
} from "../src/lib/object-storage";

let passed = 0;
async function checkAsync(label: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

const FAKE_BUCKET = "test-bucket";

// Un "vrai" S3Client, mais avec des identifiants/un endpoint entièrement
// fictifs — la présignature SigV4 n'effectue aucun appel réseau.
const fakeRealS3Client = new S3Client({
  endpoint: "https://bucket.invalid",
  region: "us-east-1",
  credentials: { accessKeyId: "FAKEKEYID", secretAccessKey: "fake-secret" },
  forcePathStyle: true,
});

console.log("=== Cas 1 — resolveImageDisplayUrl : null/absent -> null ===");
{
  await checkAsync("stored=null -> null", async () => {
    assert.equal(await resolveImageDisplayUrl(fakeRealS3Client, FAKE_BUCKET, null), null);
  });
}

console.log("=== Cas 2 — resolveImageDisplayUrl : lien externe hérité -> inchangé, AUCUN appel S3 ===");
{
  await checkAsync("URL http(s) retournée telle quelle", async () => {
    const legacyUrl = "https://exemple.com/ancien-logo.png";
    const result = await resolveImageDisplayUrl(fakeRealS3Client, FAKE_BUCKET, legacyUrl);
    assert.equal(result, legacyUrl);
  });
}

console.log("=== Cas 3 — resolveImageDisplayUrl : clé d'objet -> URL présignée réelle (SigV4) ===");
{
  await checkAsync("URL présignée pointant vers l'endpoint/bucket/clé, avec signature", async () => {
    const result = await resolveImageDisplayUrl(fakeRealS3Client, FAKE_BUCKET, "logos/abc123.png");
    assert.ok(result, "une URL doit être produite");
    assert.ok(result!.startsWith("https://bucket.invalid/test-bucket/logos/abc123.png"));
    assert.ok(result!.includes("X-Amz-Signature="));
  });
}

console.log("=== Cas 4 — uploadImageObject : envoie bien un PutObjectCommand avec les bons paramètres ===");
{
  let capturedCommand: unknown = null;
  const fakeClient: S3ClientLike = {
    send: async (command) => {
      capturedCommand = command;
      return {} as never;
    },
  };
  await checkAsync("PutObjectCommand capturé avec Bucket/Key/ContentType corrects", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await uploadImageObject(fakeClient, FAKE_BUCKET, "logements/xyz.jpg", bytes, "image/jpeg");
    assert.ok(capturedCommand instanceof PutObjectCommand);
    const input = (capturedCommand as PutObjectCommand).input;
    assert.equal(input.Bucket, FAKE_BUCKET);
    assert.equal(input.Key, "logements/xyz.jpg");
    assert.equal(input.ContentType, "image/jpeg");
    assert.deepEqual(input.Body, bytes);
  });
}

console.log("=== Cas 5 — deleteImageObject : clé réelle -> DeleteObjectCommand envoyé ===");
{
  let called = false;
  let capturedCommand: unknown = null;
  const fakeClient: S3ClientLike = {
    send: async (command) => {
      called = true;
      capturedCommand = command;
      return {} as never;
    },
  };
  await checkAsync("DeleteObjectCommand envoyé avec la bonne clé", async () => {
    await deleteImageObject(fakeClient, FAKE_BUCKET, "logements/xyz.jpg");
    assert.ok(called);
    assert.ok(capturedCommand instanceof DeleteObjectCommand);
    assert.equal((capturedCommand as DeleteObjectCommand).input.Key, "logements/xyz.jpg");
  });
}

console.log("=== Cas 6 — deleteImageObject : lien externe hérité -> AUCUN appel S3 (pas notre objet) ===");
{
  let called = false;
  const fakeClient: S3ClientLike = {
    send: async () => {
      called = true;
      return {} as never;
    },
  };
  await checkAsync("send() jamais appelé pour un lien http(s)", async () => {
    await deleteImageObject(fakeClient, FAKE_BUCKET, "https://exemple.com/ancien-logo.png");
    assert.equal(called, false);
  });
}

console.log("=== Cas 7 — Correction M2 : un échec réel de suppression n'est plus silencieux (jamais relancé, mais journalisé) ===");
{
  // DeleteObject est idempotent par spécification S3 (supprimer une clé
  // déjà absente ne lève PAS d'erreur) — toute exception simulée ici
  // représente donc un échec RÉEL (réseau/autorisation/configuration),
  // jamais un cas bénin. Avant la correction M2, ce test s'appelait
  // "objet déjà absent -> jamais bloquant" et ne vérifiait QUE l'absence de
  // levée d'exception, sans jamais vérifier qu'une trace restait — c'est
  // exactement le défaut d'observabilité constaté par l'audit.
  const originalConsoleError = console.error;
  const loggedCalls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    loggedCalls.push(args);
  };
  const fakeClient: S3ClientLike = {
    send: async () => {
      throw new Error("Network timeout contacting bucket");
    },
  };
  try {
    await checkAsync("ne relance jamais l'erreur à l'appelant", async () => {
      await deleteImageObject(fakeClient, FAKE_BUCKET, "logements/echec-reseau.jpg"); // ne doit pas lever
    });
    await checkAsync("mais journalise l'échec réel (observabilité — correction M2)", async () => {
      assert.equal(loggedCalls.length, 1);
      const logged = loggedCalls[0].join(" ");
      assert.ok(logged.includes("logements/echec-reseau.jpg"));
      assert.ok(logged.includes("Network timeout contacting bucket"));
    });
    await checkAsync("le message journalisé ne contient aucun secret (identifiant AWS, URL présignée)", async () => {
      const logged = loggedCalls[0].join(" ");
      assert.ok(!logged.includes("AWS_"), "ne doit jamais mentionner un nom de variable AWS");
      assert.ok(!logged.includes("X-Amz-"), "ne doit jamais contenir de fragment d'URL présignée");
    });
  } finally {
    console.error = originalConsoleError;
  }
}

console.log("=== Cas 8 — resolveImagePdfSource : absent -> null ===");
{
  await checkAsync("stored=null -> null", async () => {
    const fakeClient: S3ClientLike = { send: async () => ({}) as never };
    assert.equal(await resolveImagePdfSource(fakeClient, FAKE_BUCKET, null), null);
  });
}

console.log("=== Cas 9 — resolveImagePdfSource : format WebP non intégrable au PDF -> null (jamais planter) ===");
{
  await checkAsync("clé .webp -> null, sans appeler S3", async () => {
    let called = false;
    const fakeClient: S3ClientLike = {
      send: async () => {
        called = true;
        return {} as never;
      },
    };
    const result = await resolveImagePdfSource(fakeClient, FAKE_BUCKET, "logos/abc.webp");
    assert.equal(result, null);
    assert.equal(called, false);
  });
}

console.log("=== Cas 10 — resolveImagePdfSource : clé PNG valide -> octets bruts récupérés ===");
{
  const fakeBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const fakeClient: S3ClientLike = {
    send: async (command) => {
      assert.ok(command instanceof GetObjectCommand);
      return { Body: { transformToByteArray: async () => fakeBytes } } as never;
    },
  };
  await checkAsync("data/format corrects", async () => {
    const result = await resolveImagePdfSource(fakeClient, FAKE_BUCKET, "logos/abc.png");
    assert.ok(result);
    // Buffer.from(fakeBytes) est un Buffer, fakeBytes un Uint8Array simple —
    // comparaison par valeur (Buffer est une sous-classe compatible à
    // l'exécution, voir object-storage.ts), pas par constructeur exact.
    assert.deepEqual(Array.from(result!.data), Array.from(fakeBytes));
    assert.equal(result!.format, "png");
  });
}

console.log("=== Cas 11 — resolveImagePdfSource : objet inaccessible (S3 lève) -> null, jamais planter ===");
{
  const fakeClient: S3ClientLike = {
    send: async () => {
      throw new Error("AccessDenied");
    },
  };
  await checkAsync("erreur avalée, résultat null", async () => {
    const result = await resolveImagePdfSource(fakeClient, FAKE_BUCKET, "logos/prive.png");
    assert.equal(result, null);
  });
}

console.log("=== Cas 12 — resolveImagePdfSource : lien externe hérité, fetch() simulé (jamais de vrai réseau) ===");
{
  const originalFetch = globalThis.fetch;
  const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff]);
  globalThis.fetch = (async () => ({
    ok: true,
    arrayBuffer: async () => fakeBytes.buffer,
  })) as unknown as typeof fetch;
  try {
    await checkAsync("octets du lien externe récupérés via fetch simulé", async () => {
      const fakeClient: S3ClientLike = { send: async () => ({}) as never };
      const result = await resolveImagePdfSource(fakeClient, FAKE_BUCKET, "https://exemple.com/logo.jpg");
      assert.ok(result);
      assert.equal(result!.format, "jpg");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log(`\n${passed} assertions réussies. Aucun échec. Aucune écriture réelle dans un bucket.`);
