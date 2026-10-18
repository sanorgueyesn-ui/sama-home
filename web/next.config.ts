import type { NextConfig } from "next";
import path from "node:path";

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
};

export default nextConfig;
