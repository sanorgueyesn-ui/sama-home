import { z } from "zod";
import { PHONE_REGEX } from "@/lib/phone";

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

// Règle de téléphone : voir src/lib/phone.ts (définition unique, le résultat
// est ce qui est stocké en base, pour que la recherche par téléphone soit
// fiable quel que soit le formatage saisi par le gestionnaire).

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
  active: z.boolean(),
});

// Lot "Téléversement durable des images" — `photo` n'est plus un champ texte
// validé par ce schéma : c'est désormais un fichier (image/jpeg|png|webp),
// lu et validé séparément dans src/app/actions/properties.ts (contenu réel
// du fichier via src/lib/image-upload.ts, jamais l'extension/le
// Content-Type déclaré). La clé d'erreur `photo` reste possible dans
// `PropertyFormState` pour que le formulaire puisse toujours afficher un
// message de refus (fichier invalide/trop volumineux), bien qu'elle ne
// provienne plus de ce schéma Zod.
export type PropertyFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof PropertySchema>, string[]>> & { photo?: string[] };
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
  // Audit Client/Réservation, Bloc 3/4/5 — jamais obligatoires au niveau du
  // schéma (un séjour court n'en a pas besoin) : l'obligation réelle dépend
  // de la durée calculée côté serveur et de l'identité déjà au dossier du
  // client, voir checkIdentityRequirement() dans src/lib/identity.ts, appelé
  // depuis createReservation/createRentalDirect. Mêmes contraintes que
  // ClientSchema.idDocumentType/idDocumentNumber, pour rester cohérent.
  idDocumentType: optionalText(60, "Type de pièce"),
  idDocumentNumber: optionalText(60, "Numéro de pièce"),
  // Bloc 21 — arrivée rétroactive : jamais obligatoire au niveau du schéma
  // (seulement exigé par checkRetroactiveArrival() quand l'arrivée saisie
  // est réellement rétroactive, voir src/lib/retroactive-checkin.ts). Ce
  // champ n'a de sens que pour une Rental (createRentalDirect/
  // checkInReservation) — createReservation/updateReservation le reçoivent
  // aussi (même schéma partagé) mais ne le lisent jamais : une réservation
  // est un créneau futur, jamais une arrivée déjà survenue.
  retroactiveReason: optionalText(500, "Justification"),
});

export type ReservationFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof ReservationSchema>, string[]>>;
      message?: string;
    }
  | undefined;

/**
 * Lot "Reservation — client facultatif" — variante de ReservationSchema où
 * `clientId` devient facultatif (séjour court, <48h). Dérivée via `.extend()`
 * pour ne jamais dupliquer les autres champs. `ReservationSchema` elle-même
 * reste intacte et continue d'exiger un client : elle est encore réutilisée
 * telle quelle par `parseRentalForm` (actions/rentals.ts), où le client
 * reste obligatoire — non concerné par ce lot, jamais touché.
 */
export const ReservationClientOptionalSchema = ReservationSchema.extend({
  clientId: z
    .string()
    .trim()
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
});

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
  // Phase 14 audit (Bloc 9): same upper bound as TariffSchema.amount, absent
  // here until now — not exploitable (createReservationPayment/
  // createRentalPayment already refuse any amount over the real `remaining`,
  // which is itself bounded by a Tariff-derived total), but an unbounded
  // value would previously reach Postgres's 4-byte `Int` column and fail
  // there with a raw overflow error instead of a clear Zod message.
  amount: z
    .string()
    .trim()
    .min(1, "Le montant est obligatoire.")
    .transform(Number)
    .pipe(
      z
        .number("Le montant doit être un nombre.")
        .int("Le montant doit être un nombre entier (FCFA, sans centimes).")
        .min(1, "Le montant doit être supérieur à 0.")
        .max(100_000_000, "Montant trop élevé."),
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

/**
 * Bloc 16.2 — `categoryId` remplace l'ancien enum fermé `category` (Bloc
 * 16.1 a transformé `ExpenseCategory` en table configurable). Zod ne peut
 * valider ici que la FORME (un identifiant non vide) — l'existence réelle
 * et l'activité de la catégorie restent une vérification serveur contre la
 * DB (voir createExpense dans src/app/actions/expenses.ts), jamais
 * déductible d'un schéma statique.
 *
 * NOTE — `paidAt` est intentionnellement absent de ce schéma : toujours
 * `new Date()` côté serveur (Bloc 7), même règle que Payment.paidAt. Aucun
 * contrôle UI ne permet de saisir une date historique pour V1.
 */
export const ExpenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Catégorie obligatoire."),
  // Phase 14 audit (Bloc 9): same reasoning as PaymentSchema.amount above —
  // Expense has no "remaining" guard at all to indirectly bound it, so this
  // was the more directly reachable gap of the two.
  amount: z
    .string()
    .trim()
    .min(1, "Le montant est obligatoire.")
    .transform(Number)
    .pipe(
      z
        .number("Le montant doit être un nombre.")
        .int("Le montant doit être un nombre entier (FCFA, sans centimes).")
        .min(1, "Le montant doit être supérieur à 0.")
        .max(100_000_000, "Montant trop élevé."),
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

/**
 * Bloc 16.2 — nom d'une catégorie de dépense (création/renommage). Partagé
 * entre les deux actions plutôt que dupliqué (même règle que
 * `optionalText`/`PHONE_REGEX` ci-dessus : une seule définition réutilisée).
 */
export const ExpenseCategoryNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom est obligatoire.")
  .max(80, "Nom trop long (80 caractères maximum).");

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

// Lot "Téléversement durable des images" — `logoUrl` n'est plus un champ
// texte validé par ce schéma : c'est désormais un fichier, lu et validé
// séparément dans src/app/actions/settings.ts (même principe que
// PropertySchema.photo ci-dessus). La clé d'erreur `logoUrl` reste possible
// dans `SettingsFormState` pour que le formulaire puisse afficher un refus.
export type SettingsFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof SettingsSchema>, string[]>> & { logoUrl?: string[] };
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

/**
 * Phase 3G / Lot D12-P78 — inscription publique d'un établissement
 * (`/register`), distincte de `CreateUserSchema` (création d'un utilisateur
 * par un ADMIN déjà existant, pour son propre établissement). Décision
 * produit explicitement confirmée pour ce lot : aucun champ "identifiant"
 * séparé dans la maquette fournie — l'adresse e-mail saisie ici sert à la
 * fois de `User.username` (identifiant de connexion réel) et de
 * `User.email` (déjà prévu par le schéma pour les notifications
 * d'approbation/refus), jamais deux valeurs indépendantes inventées.
 * `email` obligatoire ici (contrairement à `ClientSchema.email`, optionnel)
 * — seule cette inscription a besoin d'un email systématiquement présent.
 */
export const EstablishmentRegistrationSchema = z.object({
  establishmentName: z
    .string()
    .trim()
    .min(1, "Le nom de l'établissement est obligatoire.")
    .max(120, "Nom de l'établissement : 120 caractères maximum."),
  managerName: z.string().trim().min(1, "Votre nom est obligatoire.").max(120, "Nom : 120 caractères maximum."),
  email: z
    .string()
    .trim()
    .min(1, "L'adresse e-mail est obligatoire.")
    .max(180, "Email : 180 caractères maximum.")
    .pipe(z.email("Adresse e-mail invalide.")),
  password: newPasswordField(),
  plan: z.enum(["FREE_TRIAL", "PAID_9900"]).default("FREE_TRIAL"),
});

export type EstablishmentRegistrationFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof EstablishmentRegistrationSchema>, string[]>>;
      message?: string;
      success?: boolean;
      requiresOtp?: boolean;
      googleRegistered?: boolean;
      pendingApproval?: boolean;
      establishmentName?: string;
      email?: string;
      plan?: string;
      testCode?: string;
      reference?: string;
    }
  | undefined;

export const VerifyOtpSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  code: z.string().trim().length(6, "Le code doit comporter exactement 6 chiffres."),
});

export type VerifyOtpFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof VerifyOtpSchema>, string[]>>;
      message?: string;
      success?: boolean;
      pendingApproval?: boolean;
      plan?: string;
      establishmentName?: string;
      reference?: string;
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

// ---------------------------------------------------------------------------
// Bloc 17.2 — Caisse & Banque
// ---------------------------------------------------------------------------

/**
 * Bloc 17.2, section 7/BLOC 7 — jamais de numéro de compte complet, jamais
 * d'IBAN, jamais d'identifiants d'accès : `maskedAccountNumber` est une
 * chaîne déjà masquée par l'utilisateur (ex. "•••• 4821"), jamais validée
 * comme un vrai numéro de compte.
 */
export const BankAccountSchema = z.object({
  label: z.string().trim().min(1, "Le nom du compte est obligatoire.").max(120, "Nom trop long."),
  bankName: z.string().trim().min(1, "Le nom de la banque est obligatoire.").max(120, "Nom trop long."),
  maskedAccountNumber: optionalText(40, "Numéro masqué"),
});

/**
 * BLOC 9 — `fixedAmount` XOR `percentage`, jamais les deux, jamais aucun
 * des deux (la contrainte CHECK `TransferSchedule_amount_type_check` en
 * base est le filet de sécurité final — ce schéma est la première
 * validation côté serveur, pas la seule).
 */
export const TransferScheduleSchema = z
  .object({
    bankAccountId: z.string().trim().min(1, "Compte bancaire obligatoire."),
    frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"], "Fréquence invalide."),
    amountType: z.enum(["FIXED", "PERCENTAGE"], "Type de montant invalide."),
    fixedAmount: z.number().int("Montant invalide.").positive("Le montant doit être positif.").optional(),
    percentage: z
      .number()
      .int("Pourcentage invalide.")
      .min(1, "Le pourcentage doit être supérieur à 0.")
      .max(100, "Le pourcentage ne peut pas dépasser 100.")
      .optional(),
    nextRunAt: z.date(),
  })
  .refine(
    (data) =>
      data.amountType === "FIXED"
        ? data.fixedAmount !== undefined && data.percentage === undefined
        : data.percentage !== undefined && data.fixedAmount === undefined,
    {
      error: "Fournir un montant fixe (si FIXED) ou un pourcentage (si PERCENTAGE), jamais les deux ni aucun des deux.",
      path: ["amountType"],
    },
  );

/**
 * Phase 3G / Lot D12-P103 — bornes explicitement retenues pour ce lot (pas
 * de valeur arbitraire) : durées en mois raisonnables pour un essai ou une
 * période d'abonnement (1 à 12 — au-delà, une "durée" perdrait son sens
 * pratique pour ce produit), prix en FCFA borné pour éviter une saisie
 * aberrante (0, négative, ou démesurée) tout en couvrant largement la plage
 * réaliste d'un abonnement mensuel/trimestriel pour un seul établissement.
 */
export const PricingSettingsSchema = z.object({
  trialDurationMonths: z
    .number()
    .int("La durée d'essai doit être un nombre entier de mois.")
    .min(1, "La durée d'essai doit être d'au moins 1 mois.")
    .max(12, "La durée d'essai ne peut pas dépasser 12 mois."),
  periodMonths: z
    .number()
    .int("La durée de période doit être un nombre entier de mois.")
    .min(1, "La durée de période doit être d'au moins 1 mois.")
    .max(12, "La durée de période ne peut pas dépasser 12 mois."),
  periodPriceFcfa: z
    .number()
    .int("Le prix doit être un nombre entier de FCFA.")
    .min(500, "Le prix doit être d'au moins 500 FCFA.")
    .max(1_000_000, "Le prix ne peut pas dépasser 1 000 000 FCFA."),
});

export type PricingSettingsFormState = {
  errors?: Partial<Record<keyof z.infer<typeof PricingSettingsSchema>, string[]>>;
  message?: string;
  success?: boolean;
};
