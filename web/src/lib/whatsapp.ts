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

/**
 * `wa.me` (format universel officiel Meta pour le "click-to-chat") plutôt
 * qu'une distinction mobile/web/desktop : ce lien redirige lui-même vers
 * l'app WhatsApp si installée (mobile) ou vers WhatsApp Web/l'app bureau
 * sinon — aucune détection de plateforme à coder ici.
 *
 * Ne construit JAMAIS un lien à partir d'un numéro absent ou invalide — le
 * `+` initial éventuel est retiré (format attendu par wa.me : chiffres
 * uniquement), mais aucun indicatif pays n'est ajouté ou supposé : si le
 * numéro enregistré n'en contient pas, le lien généré reflète exactement ce
 * qui est en base, ni plus ni moins.
 */
export function buildReservationWhatsAppLink(input: WhatsAppReservationInput): WhatsAppLinkResult {
  const phone = input.clientPhone?.trim();
  if (!phone || !PHONE_REGEX.test(phone)) {
    return { ok: false, reason: "Ce client n'a pas de numéro de téléphone valide pour WhatsApp." };
  }
  const digits = phone.replace(/^\+/, "");
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
};

export function buildRentalWhatsAppMessage(input: WhatsAppRentalInput): string {
  if (input.isCompleted) {
    const departure = input.actualDepartureAt ?? input.plannedDepartureAt;
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
  if (!phone || !PHONE_REGEX.test(phone)) {
    return { ok: false, reason: "Ce client n'a pas de numéro de téléphone valide pour WhatsApp." };
  }
  const digits = phone.replace(/^\+/, "");
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
