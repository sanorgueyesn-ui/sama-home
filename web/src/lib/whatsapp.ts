/**
 * Lot "Confirmation de réservation par WhatsApp" — construction PURE d'un
 * lien wa.me (aucun appel réseau, aucune dépendance Prisma/server-only :
 * testable isolément, même esprit que src/lib/duration.ts et
 * src/lib/transfer-frequency.ts). N'ENVOIE jamais rien : ce module ne fait
 * que préparer une URL que le gestionnaire ouvre et valide lui-même — voir
 * le commentaire sur `buildReservationWhatsAppLink` pour la raison exacte.
 *
 * Numéro : réutilise PHONE_REGEX (src/lib/phone.ts, même définition que
 * ClientSchema/SettingsSchema — audit "Correction globale" : plus aucune
 * règle de téléphone dupliquée dans ce projet). Un numéro absent ou qui ne
 * respecte pas ce format produit `{ ok: false }` : AUCUN numéro n'est
 * jamais inventé ni complété (pas d'indicatif pays ajouté d'office).
 */
import { PHONE_REGEX } from "@/lib/phone";

export type WhatsAppReservationInput = {
  clientName: string;
  clientPhone: string | null | undefined;
  establishmentName: string;
  propertyName: string;
  arrivalAt: Date;
  departureAt: Date;
  durationLabel: string;
  amount: number;
  deposit: number;
  /** Optionnel : préserve la signature pour tout appelant existant qui ne le fournirait pas. */
  statusLabel?: string;
  customTemplate?: string | null;
};

export type WhatsAppLinkResult = { ok: true; url: string } | { ok: false; reason: string };

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/** Texte prérempli — uniquement des données réellement enregistrées (jamais inventées). */
export function buildReservationWhatsAppMessage(input: WhatsAppReservationInput): string {
  if (input.customTemplate && input.customTemplate.trim().length > 0) {
    let msg = input.customTemplate;
    msg = msg.replace(/\{client\}/gi, input.clientName);
    msg = msg.replace(/\{logement\}/gi, input.propertyName);
    msg = msg.replace(/\{arrivee\}/gi, fmtDateTime(input.arrivalAt));
    msg = msg.replace(/\{depart\}/gi, fmtDateTime(input.departureAt));
    msg = msg.replace(/\{montant\}/gi, fmtFcfa(input.amount));
    msg = msg.replace(/\{etablissement\}/gi, input.establishmentName);
    msg = msg.replace(/\{acompte\}/gi, fmtFcfa(input.deposit));
    return msg;
  }

  const lines = [
    `Bonjour ${input.clientName},`,
    "",
    `Voici la confirmation de votre réservation chez ${input.establishmentName}.`,
    `Logement : ${input.propertyName}`,
    `Arrivée : ${fmtDateTime(input.arrivalAt)}`,
    `Départ prévu : ${fmtDateTime(input.departureAt)}`,
    `Durée : ${input.durationLabel}`,
  ];
  if (input.statusLabel) {
    lines.push(`Statut : ${input.statusLabel}`);
  }
  lines.push(`Montant total : ${fmtFcfa(input.amount)}`);
  if (input.deposit > 0) {
    lines.push(`Acompte déjà versé : ${fmtFcfa(input.deposit)}`);
  }
  lines.push("", "Merci de votre confiance.");
  return lines.join("\n");
}

export function buildReservationWhatsAppLink(input: WhatsAppReservationInput): WhatsAppLinkResult {
  const phone = input.clientPhone?.trim();
  if (!phone) {
    return { ok: false, reason: "Ce client n'a pas de numéro de téléphone enregistré." };
  }
  const digits = normalizeWhatsAppDigits(phone);
  if (!/^[0-9]{9,15}$/.test(digits)) {
    return { ok: false, reason: "Numéro de téléphone invalide pour WhatsApp." };
  }
  const message = buildReservationWhatsAppMessage(input);
  return { ok: true, url: `https://wa.me/${digits}?text=${encodeURIComponent(message)}` };
}

export type WhatsAppRentalInput = {
  clientName: string;
  clientPhone: string | null | undefined;
  establishmentName: string;
  propertyName: string;
  arrivalAt: Date;
  plannedDepartureAt: Date;
  amount: number;
  isCompleted?: boolean;
  actualDepartureAt?: Date | null;
  customTemplate?: string | null;
};

/** Normalise un numéro pour un lien wa.me (ajoute 221 si numéro local sénégalais à 9 chiffres) */
export function normalizeWhatsAppDigits(rawPhone: string): string {
  let digits = rawPhone.trim().replace(/[\s.-]/g, "").replace(/^\+/, "");
  // Si numéro sénégalais à 9 chiffres débutant par 7 (70, 75, 76, 77, 78) sans indicatif
  if (/^7[05678][0-9]{7}$/.test(digits)) {
    digits = `221${digits}`;
  }
  return digits;
}

export function buildRentalWhatsAppMessage(input: WhatsAppRentalInput): string {
  const departure = input.actualDepartureAt ?? input.plannedDepartureAt;

  // Si un modèle personnalisé est configuré dans les Paramètres
  if (input.customTemplate && input.customTemplate.trim().length > 0) {
    let msg = input.customTemplate;
    msg = msg.replace(/\{client\}/gi, input.clientName);
    msg = msg.replace(/\{logement\}/gi, input.propertyName);
    msg = msg.replace(/\{arrivee\}/gi, fmtDateTime(input.arrivalAt));
    msg = msg.replace(/\{depart\}/gi, fmtDateTime(departure));
    msg = msg.replace(/\{montant\}/gi, fmtFcfa(input.amount));
    msg = msg.replace(/\{etablissement\}/gi, input.establishmentName);
    msg = msg.replace(/\{statut\}/gi, input.isCompleted ? "Séjour terminé" : "En cours");
    return msg;
  }

  if (input.isCompleted) {
    const lines = [
      `Bonjour ${input.clientName},`,
      "",
      `Voici le récapitulatif de votre séjour chez ${input.establishmentName} :`,
      `🏨 Logement : ${input.propertyName}`,
      `📥 Arrivée : ${fmtDateTime(input.arrivalAt)}`,
      `📤 Départ : ${fmtDateTime(departure)}`,
      `💰 Montant total : ${fmtFcfa(input.amount)}`,
      `✅ Statut : Séjour terminé (Check-out effectué)`,
      "",
      "Nous vous remercions chaleureusement pour votre visite et espérons vous revoir très bientôt !",
      `— L'équipe ${input.establishmentName}`,
    ];
    return lines.join("\n");
  }

  const lines = [
    `Bonjour ${input.clientName},`,
    "",
    `Voici les informations de votre séjour chez ${input.establishmentName} :`,
    `🏨 Logement : ${input.propertyName}`,
    `📥 Arrivée : ${fmtDateTime(input.arrivalAt)}`,
    `📤 Départ prévu : ${fmtDateTime(input.plannedDepartureAt)}`,
    `💰 Montant du séjour : ${fmtFcfa(input.amount)}`,
    "",
    "Merci de votre confiance.",
    `— L'équipe ${input.establishmentName}`,
  ];
  return lines.join("\n");
}

export function buildRentalWhatsAppLink(input: WhatsAppRentalInput): WhatsAppLinkResult {
  const phone = input.clientPhone?.trim();
  if (!phone) {
    return { ok: false, reason: "Ce client n'a pas de numéro de téléphone enregistré." };
  }
  const digits = normalizeWhatsAppDigits(phone);
  if (!/^[0-9]{9,15}$/.test(digits)) {
    return { ok: false, reason: "Numéro de téléphone invalide pour WhatsApp." };
  }
  const message = buildRentalWhatsAppMessage(input);
  return { ok: true, url: `https://wa.me/${digits}?text=${encodeURIComponent(message)}` };
}

/** Lien direct vers WhatsApp sans message pré-rempli ou avec message sur mesure */
export function buildDirectWhatsAppLink(phone: string | null | undefined, text?: string): WhatsAppLinkResult {
  const trimmed = phone?.trim();
  if (!trimmed || !PHONE_REGEX.test(trimmed)) {
    return { ok: false, reason: "Numéro de téléphone invalide pour WhatsApp." };
  }
  const digits = trimmed.replace(/^\+/, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return { ok: true, url: `https://wa.me/${digits}${query}` };
}
