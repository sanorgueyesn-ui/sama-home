import "server-only";
import { resolveBrandColors } from "@/lib/brand-colors";
import { resolveImagePdfSource } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";
import { getSettings } from "@/lib/settings-data";
import { sampleBrand } from "./samples";
import type { DocumentBrand } from "./types";

/**
 * Marque utilisée pour les aperçus : celle de l'établissement ACTIF (nom, coordonnées, logo, palette), lue
 * pour la session. Seule la marque est réelle ; tout le reste de l'aperçu est un exemple. Si
 * l'établissement n'a pas encore enregistré ses informations, on garde la marque d'exemple (jamais celle de
 * SAMA HOME) avec les couleurs par défaut.
 */
export async function getPreviewBrand(): Promise<DocumentBrand> {
  const settings = await getSettings();
  if (!settings) return sampleBrand();
  const logo = settings.logoUrl ? await resolveImagePdfSource(getS3Client(), getBucketName(), settings.logoUrl) : null;
  return {
    name: settings.establishmentName,
    address: settings.address,
    phone: settings.phone,
    secondaryPhone: settings.secondaryPhone,
    email: settings.email,
    ninea: settings.ninea,
    rccm: settings.rccm,
    logo,
    colors: resolveBrandColors(settings),
  };
}
