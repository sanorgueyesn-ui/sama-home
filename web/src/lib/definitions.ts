import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().trim().min(1, "Identifiant requis."),
  password: z.string().min(1, "Mot de passe requis."),
  remember: z.boolean(),
});

export type LoginFormState =
  | {
      error: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 3 — Clients
// ---------------------------------------------------------------------------

/**
 * Règle de téléphone (documentée, comme demandé) : après suppression des
 * espaces/points/tirets, le numéro doit faire 8 à 15 chiffres, avec un "+"
 * initial optionnel. Volontairement pas restreint à l'indicatif sénégalais
 * (+221) : un client peut être étranger. Le résultat est ce qui est stocké
 * en base, pour que la recherche par téléphone soit fiable quel que soit le
 * formatage saisi par le gestionnaire.
 */
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères maximum.`)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional();

export const ClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(120, "Le nom : 120 caractères maximum."),
  phone: z
    .string()
    .trim()
    .min(1, "Le téléphone est obligatoire.")
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .pipe(
      z
        .string()
        .regex(PHONE_REGEX, "Numéro invalide : 8 à 15 chiffres, un « + » initial optionnel."),
    ),
  email: z
    .string()
    .trim()
    .max(180, "Email : 180 caractères maximum.")
    .transform((v) => (v.length === 0 ? undefined : v))
    .pipe(z.email("Email invalide.").optional())
    .optional(),
  address: optionalText(240, "Adresse"),
  idDocumentType: optionalText(60, "Type de pièce"),
  idDocumentNumber: optionalText(60, "Numéro de pièce"),
  notes: optionalText(1000, "Notes"),
});

export type ClientFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof ClientSchema>, string[]>>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 4 — Logements
// ---------------------------------------------------------------------------

export const PROPERTY_TYPE_VALUES = ["ROOM", "APARTMENT"] as const;

export const PropertySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(120, "Le nom : 120 caractères maximum."),
  type: z.enum(PROPERTY_TYPE_VALUES, "Le type est obligatoire."),
  description: optionalText(500, "Description"),
  // Capacité : pas explicitement marquée obligatoire/optionnelle dans le
  // prompt maître, mais chaque logement de la maquette en affiche une
  // (« 2 personnes »...) — traitée comme obligatoire, borne raisonnable
  // documentée ici (1 à 50 personnes).
  capacity: z
    .string()
    .trim()
    .min(1, "La capacité est obligatoire.")
    .transform((v) => Number(v))
    .pipe(
      z
        .number("La capacité doit être un nombre.")
        .int("La capacité doit être un nombre entier.")
        .min(1, "Minimum 1 personne.")
        .max(50, "Maximum 50 personnes."),
    ),
  // Simple URL collée par le gestionnaire — pas d'upload de fichier (voir
  // consigne Phase 4, section PHOTO).
  photo: z
    .string()
    .trim()
    .max(2048, "URL trop longue.")
    .transform((v) => (v.length === 0 ? undefined : v))
    .pipe(z.url("URL de photo invalide.").optional())
    .optional(),
  active: z.boolean(),
});

export type PropertyFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof PropertySchema>, string[]>>;
      message?: string;
    }
  | undefined;
