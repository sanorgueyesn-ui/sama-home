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

// ---------------------------------------------------------------------------
// Phase 5 — Tarifs
// ---------------------------------------------------------------------------

export const TARIFF_TYPE_VALUES = ["HEURE", "NUIT", "JOUR", "SEMAINE", "MOIS"] as const;
export const DURATION_UNIT_VALUES = ["HOURS", "NIGHT", "DAY", "WEEK", "MONTH"] as const;

export const TariffSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Le libellé est obligatoire.")
    .max(60, "Le libellé : 60 caractères maximum."),
  type: z.enum(TARIFF_TYPE_VALUES, "Type de tarif invalide."),
  durationValue: z
    .string()
    .trim()
    .min(1, "La durée est obligatoire.")
    .transform((v) => Number(v))
    .pipe(
      z
        .number("La durée doit être un nombre.")
        .int("La durée doit être un nombre entier.")
        .min(1, "La durée doit être supérieure à 0.")
        .max(365, "Durée trop grande (max 365)."),
    ),
  durationUnit: z.enum(DURATION_UNIT_VALUES, "Unité de durée invalide."),
  // FCFA entier — voir le commentaire sur `model Tariff` dans schema.prisma.
  amount: z
    .string()
    .trim()
    .min(1, "Le montant est obligatoire.")
    .transform((v) => Number(v))
    .pipe(
      z
        .number("Le montant doit être un nombre.")
        .int("Le montant doit être un nombre entier (FCFA, sans centimes).")
        .min(1, "Le montant doit être supérieur à 0.")
        .max(100_000_000, "Montant trop élevé."),
    ),
  active: z.boolean(),
});

export type TariffFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof TariffSchema>, string[]>>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 6 — Réservations
// ---------------------------------------------------------------------------

export const RESERVATION_STATUS_VALUES = [
  "CONFIRMED",
  "ARRIVED",
  "CANCELLED",
  "COMPLETED",
] as const;
export const PAYMENT_METHOD_VALUES = ["CASH", "WAVE", "ORANGE_MONEY", "OTHER"] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * NOTE — `durationValue`, `durationUnit` and `amount` are intentionally NOT
 * part of this schema: they are never trusted from the client. The server
 * derives them from the authoritative Tariff row at submission time (see
 * src/app/actions/reservations.ts) — otherwise a tampered request could book
 * any amount. `status` is also excluded: it only ever changes through the
 * dedicated `cancelReservation` action, never through this form.
 */
export const ReservationSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est obligatoire."),
  propertyId: z.string().trim().min(1, "Le logement est obligatoire."),
  tariffId: z.string().trim().min(1, "Le tarif est obligatoire."),
  date: z
    .string()
    .trim()
    .min(1, "La date est obligatoire.")
    .regex(DATE_REGEX, "Date invalide (AAAA-MM-JJ).")
    .refine((v) => {
      const d = new Date(`${v}T00:00:00`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, "Date invalide."),
  arrivalTime: z
    .string()
    .trim()
    .min(1, "L'heure d'arrivée est obligatoire.")
    .regex(TIME_REGEX, "Heure invalide (HH:MM)."),
  deposit: z
    .string()
    .trim()
    .transform((v) => (v.length === 0 ? "0" : v))
    .transform(Number)
    .pipe(
      z
        .number("L'acompte doit être un nombre.")
        .int("L'acompte doit être un nombre entier.")
        .min(0, "L'acompte ne peut pas être négatif."),
    ),
  depositMethod: z
    .string()
    .trim()
    .transform((v) => (v.length === 0 ? undefined : v))
    .pipe(z.enum(PAYMENT_METHOD_VALUES, "Mode de paiement invalide.").optional())
    .optional(),
  note: optionalText(1000, "Note"),
});

export type ReservationFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof ReservationSchema>, string[]>>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 8 — Paiements
// ---------------------------------------------------------------------------

/**
 * NOTE — `remaining` is intentionally NOT part of this schema: the browser's
 * idea of "reste à payer" is never trusted (Bloc 17). The server always
 * recomputes it from real Payment rows, inside the transaction, at
 * submission time (see src/app/actions/payments.ts). `paidAt` is also
 * excluded: it is always `new Date()` server-side (Bloc 11) — no UI control
 * exists to pick a historical date.
 */
export const PaymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Le montant est obligatoire.")
    .transform(Number)
    .pipe(
      z
        .number("Le montant doit être un nombre.")
        .int("Le montant doit être un nombre entier (FCFA, sans centimes).")
        .min(1, "Le montant doit être supérieur à 0."),
    ),
  method: z.enum(PAYMENT_METHOD_VALUES, "Mode de paiement invalide."),
  reference: optionalText(120, "Référence"),
  note: optionalText(500, "Note"),
});

export type PaymentFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof PaymentSchema>, string[]>>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 9 — Dépenses
// ---------------------------------------------------------------------------

export const EXPENSE_CATEGORY_VALUES = [
  "RENT",
  "ELECTRICITY",
  "WATER",
  "INTERNET",
  "CLEANING",
  "MAINTENANCE",
  "REPAIR",
  "SALARY",
  "PURCHASE",
  "OTHER",
] as const;

/**
 * NOTE — `paidAt` is intentionally NOT part of this schema: it is always
 * `new Date()` server-side (Bloc 7), same rule as Payment.paidAt. No UI
 * control exists to pick a historical date for V1.
 */
export const ExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_VALUES, "Catégorie invalide."),
  amount: z
    .string()
    .trim()
    .min(1, "Le montant est obligatoire.")
    .transform(Number)
    .pipe(
      z
        .number("Le montant doit être un nombre.")
        .int("Le montant doit être un nombre entier (FCFA, sans centimes).")
        .min(1, "Le montant doit être supérieur à 0."),
    ),
  method: z.enum(PAYMENT_METHOD_VALUES, "Mode de paiement invalide."),
  reference: optionalText(120, "Référence"),
  note: optionalText(500, "Note"),
});

export type ExpenseFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof ExpenseSchema>, string[]>>;
      message?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Phase 11 — Paramètres
// ---------------------------------------------------------------------------

/**
 * Bloc 5 — "Informations générales" de l'établissement. Réutilise PHONE_REGEX
 * (défini plus haut pour ClientSchema, Phase 3) — pas de deuxième règle de
 * téléphone inventée (Bloc 16 : "format téléphone si une validation existe
 * déjà").
 */
export const SettingsSchema = z.object({
  establishmentName: z
    .string()
    .trim()
    .min(1, "Le nom de l'établissement est obligatoire.")
    .max(120, "Le nom : 120 caractères maximum."),
  phone: z
    .string()
    .trim()
    .min(1, "Le téléphone est obligatoire.")
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .pipe(z.string().regex(PHONE_REGEX, "Numéro invalide : 8 à 15 chiffres, un « + » initial optionnel.")),
  secondaryPhone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .transform((v) => (v.length === 0 ? undefined : v))
    .pipe(z.string().regex(PHONE_REGEX, "Numéro invalide : 8 à 15 chiffres, un « + » initial optionnel.").optional())
    .optional(),
  address: z
    .string()
    .trim()
    .min(1, "L'adresse est obligatoire.")
    .max(240, "Adresse : 240 caractères maximum."),
  email: z
    .string()
    .trim()
    .max(180, "Email : 180 caractères maximum.")
    .transform((v) => (v.length === 0 ? undefined : v))
    .pipe(z.email("Email invalide.").optional())
    .optional(),
  description: optionalText(500, "Description"),
});

export type SettingsFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof SettingsSchema>, string[]>>;
      message?: string;
    }
  | undefined;

/**
 * Bloc 10/16 — aucune règle de force de mot de passe n'existait avant cette
 * phase (le script de seed ne vérifie que la présence d'une valeur). 8
 * caractères minimum est une décision prise ici, pas une règle préexistante
 * réutilisée — signalée dans le rapport plutôt que silencieusement choisie.
 */
const NEW_PASSWORD_MIN = 8;
const newPasswordField = () =>
  z
    .string()
    .min(1, "Le nouveau mot de passe est obligatoire.")
    .min(NEW_PASSWORD_MIN, `Le mot de passe doit contenir au moins ${NEW_PASSWORD_MIN} caractères.`);

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire."),
    newPassword: newPasswordField(),
    confirmPassword: z.string().min(1, "La confirmation est obligatoire."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "La confirmation ne correspond pas au nouveau mot de passe.",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormState =
  | {
      errors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>>;
      message?: string;
    }
  | undefined;

export const USER_ROLE_VALUES = ["ADMIN", "GESTIONNAIRE"] as const;

export const CreateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "L'identifiant est obligatoire.")
    .max(60, "Identifiant : 60 caractères maximum."),
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom : 120 caractères maximum."),
  password: newPasswordField(),
  role: z.enum(USER_ROLE_VALUES, "Rôle invalide."),
});

export type CreateUserFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof CreateUserSchema>, string[]>>;
      message?: string;
    }
  | undefined;

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom : 120 caractères maximum."),
  role: z.enum(USER_ROLE_VALUES, "Rôle invalide."),
});

export type UpdateUserFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof UpdateUserSchema>, string[]>>;
      message?: string;
    }
  | undefined;

export const ResetPasswordSchema = z
  .object({
    newPassword: newPasswordField(),
    confirmPassword: z.string().min(1, "La confirmation est obligatoire."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "La confirmation ne correspond pas au nouveau mot de passe.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormState =
  | {
      errors?: Partial<Record<"newPassword" | "confirmPassword", string[]>>;
      message?: string;
    }
  | undefined;
