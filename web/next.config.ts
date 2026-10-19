import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";

// Normalisation Windows : sur certains volumes (FAT32/exFAT), readlink sur un fichier standard renvoie EISDIR au lieu de EINVAL
if (process.platform === "win32") {
  const origSync = fs.readlinkSync;
  (fs as any).readlinkSync = function (p: any, options: any) {
    try {
      return origSync(p, options);
    } catch (err: any) {
      if (err && err.code === "EISDIR") err.code = "EINVAL";
      throw err;
    }
  };

  const origAsync = fs.readlink;
  (fs as any).readlink = function (p: any, ...args: any[]) {
    const cb = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
    if (cb) {
      args[args.length - 1] = function (err: any, linkString: any) {
        if (err && err.code === "EISDIR") err.code = "EINVAL";
        return cb(err, linkString);
      };
    }
    return (origAsync as any).apply(fs, [p, ...args]);
  };

  if (fs.promises?.readlink) {
    const origPromises = fs.promises.readlink;
    (fs.promises as any).readlink = async function (p: any, options: any) {
      try {
        return await origPromises(p, options);
      } catch (err: any) {
        if (err && err.code === "EISDIR") err.code = "EINVAL";
        throw err;
      }
    };
  }
}

const nextConfig: NextConfig = {
  // Pin the workspace root to this app: avoids Turbopack picking up an
  // unrelated package-lock.json higher up in the user's home directory.
  turbopack: {
    root: path.join(__dirname),
  },
  // Correction H1 (audit "Téléversement durable des images") — Next.js
  // limite par défaut le corps d'une Server Action à 1 Mo, alors que
  // MAX_IMAGE_BYTES (src/lib/image-upload.ts) autorise jusqu'à 5 Mo : tout
  // fichier de 1 à 5 Mo était rejeté par Next.js lui-même, avant même
  // d'atteindre la validation applicative et son message compréhensible.
  // 6 Mo couvre les 5 Mo de contenu réel + la marge du multipart/form-data
  // (limites de parties, en-têtes, autres champs texte du formulaire —
  // de l'ordre de quelques Ko, jamais des Mo). Impact mémoire vérifié avant
  // ce choix : ce plafond ne borne qu'UNE seule requête à la fois : pour
  // une application de cette taille (un établissement, quelques
  // gestionnaires), même une dizaine d'envois simultanés représenterait au
  // plus ~60 Mo, négligeable face à la mémoire d'un processus Node. Pas
  // relevé au-delà de 6 Mo précisément pour ne pas élargir cette marge sans
  // nécessité démontrée.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
