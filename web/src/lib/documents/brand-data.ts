import "server-only";
import { resolveBrandColors } from "@/lib/brand-colors";
import { resolveImagePdfSource } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";
import type { DocumentBrand } from "./types";

type SettingsRow = {
  establishmentName: string;
  address: string;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  logoUrl: string | null;
  ninea: string | null;
  rccm: string | null;
} & Parameters<typeof resolveBrandColors>[0];

/** Marque RÉELLE de l'établissement pour un document émis : jamais une marque d'exemple. */
export async function brandFromSettings(settings: SettingsRow): Promise<DocumentBrand> {
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
