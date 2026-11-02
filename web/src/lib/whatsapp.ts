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
 *
 * Présentation des messages : sobre et professionnelle. Aucun emoji (ils
 * arrivaient corrompus dans WhatsApp Web et donnent un ton « automatique »),
 * un en-tête au nom de l'établissement, des rubriques en gras (WhatsApp met
 * en gras `*texte*`), une formule de politesse. Le Wi-Fi n'est ajouté que s'il
 * est renseigné ; rien n'est inventé.
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
  /** Wi-Fi de l'établissement : ajouté au message seulement si le nom du réseau est renseigné. */
  wifiName?: string | null;
  wifiPassword?: string | null;
};

export type WhatsAppLinkResult = { ok: true; url: string } | { ok: false; reason: string };

/** « jeudi 29 octobre 2026 » */
function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** « jeudi 29 octobre 2026 à 14 h 00 » : l'heure à la française, jamais « 14:00 ». */
function fmtDateTime(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(d)} à ${hours} h ${minutes}`;
}

function fmtFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

const clean = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "");

type Row = [label: string, value: string];

/** Une rubrique : titre en gras, puis « Libellé : valeur » par ligne. */
function section(title: string, rows: Row[]): string[] {
  return [`*${title}*`, ...rows.map(([label, value]) => `${label} : ${value}`)];
}

/** Rubrique Wi-Fi : vide (donc absente) sans nom de réseau ; le mot de passe seulement s'il existe. */
function wifiSection(wifiName: string | null | undefined, wifiPassword: string | null | undefined): string[] {
  const network = clean(wifiName);
  if (!network) return [];
  const rows: Row[] = [["Réseau", network]];
  if (clean(wifiPassword)) rows.push(["Mot de passe", clean(wifiPassword)]);
  return section("Connexion Wi-Fi", rows);
}

/** En-tête : le nom de l'établissement en gras et en capitales. Absent si le nom est vide. */
function header(establishmentName: string): string[] {
  const name = clean(establishmentName);
  return name ? [`*${name.toUpperCase()}*`] : [];
}

function closing(establishmentName: string): string[] {
  const name = clean(establishmentName);
  return name ? ["Cordialement,", name] : ["Cordialement,"];
}

/** Assemble des blocs séparés par une ligne vide ; un bloc vide disparaît sans laisser de ligne en trop. */
function assemble(blocks: string[][]): string {
  return blocks
    .filter((block) => block.length > 0)
    .map((block) => block.join("\n"))
    .join("\n\n");
}

/** Variables d'un texte personnalisé. `{statut}` n'existe que pour une location, d'où le paramètre. */
function fillVariables(
  template: string,
  values: {
    client: string;
    logement: string;
    arrivee: string;
    depart: string;
    montant: string;
    etablissement: string;
    acompte?: string;
    statut?: string;
    wifiName?: string | null;
    wifiPassword?: string | null;
  },
): string {
  let msg = template;
  msg = msg.replace(/\{client\}/gi, values.client);
  msg = msg.replace(/\{logement\}/gi, values.logement);
  msg = msg.replace(/\{arrivee\}/gi, values.arrivee);
  msg = msg.replace(/\{depart\}/gi, values.depart);
  msg = msg.replace(/\{montant\}/gi, values.montant);
  msg = msg.replace(/\{etablissement\}/gi, values.etablissement);
  if (values.acompte !== undefined) msg = msg.replace(/\{acompte\}/gi, values.acompte);
  if (values.statut !== undefined) msg = msg.replace(/\{statut\}/gi, values.statut);
  msg = msg.replace(/\{wifi\}/gi, clean(values.wifiName));
  msg = msg.replace(/\{motdepasse\}/gi, clean(values.wifiPassword));
  return msg;
}

/** Texte prérempli — uniquement des données réellement enregistrées (jamais inventées). */
export function buildReservationWhatsAppMessage(input: WhatsAppReservationInput): string {
  const template = clean(input.customTemplate);
  if (template) {
    if (template.includes("{")) {
      return fillVariables(template, {
        client: input.clientName,
        logement: input.propertyName,
        arrivee: fmtDateTime(input.arrivalAt),
        depart: fmtDateTime(input.departureAt),
        montant: fmtFcfa(input.amount),
        etablissement: input.establishmentName,
        acompte: fmtFcfa(input.deposit),
        wifiName: input.wifiName,
        wifiPassword: input.wifiPassword,
      });
    }
    const stay: Row[] = [
      ["Logement", input.propertyName],
      ["Arrivée", fmtDateTime(input.arrivalAt)],
      ["Départ", fmtDateTime(input.departureAt)],
      ["Montant total", fmtFcfa(input.amount)],
    ];
    if (input.deposit > 0) stay.push(["Acompte versé", fmtFcfa(input.deposit)]);
    return assemble([
      header(input.establishmentName),
      [`Bonjour ${input.clientName},`],
      [template],
      section("Votre séjour", stay),
      wifiSection(input.wifiName, input.wifiPassword),
      closing(input.establishmentName),
    ]);
  }

  const stay: Row[] = [
    ["Logement", input.propertyName],
    ["Arrivée", fmtDateTime(input.arrivalAt)],
    ["Départ", fmtDateTime(input.departureAt)],
    ["Durée", input.durationLabel],
  ];
  if (input.statusLabel) stay.push(["Statut", input.statusLabel]);
  stay.push(["Montant total", fmtFcfa(input.amount)]);
  if (input.deposit > 0) stay.push(["Acompte versé", fmtFcfa(input.deposit)]);
  return assemble([
    header(input.establishmentName),
    [`Bonjour ${input.clientName},`],
    ["Nous avons le plaisir de vous confirmer votre réservation."],
    section("Votre séjour", stay),
    wifiSection(input.wifiName, input.wifiPassword),
    ["Nous vous remercions de votre confiance."],
    closing(input.establishmentName),
  ]);
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
  /** Wi-Fi de l'établissement : ajouté au message d'un séjour en cours seulement si le nom du réseau est renseigné. */
  wifiName?: string | null;
  wifiPassword?: string | null;
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
  // Le Wi-Fi sert à un client présent : jamais dans le récapitulatif d'un séjour terminé.
  const wifi = input.isCompleted ? [] : wifiSection(input.wifiName, input.wifiPassword);

  // Si un message personnalisé est configuré dans les Paramètres
  const template = clean(input.customTemplate);
  if (template) {
    if (template.includes("{")) {
      return fillVariables(template, {
        client: input.clientName,
        logement: input.propertyName,
        arrivee: fmtDateTime(input.arrivalAt),
        depart: fmtDateTime(departure),
        montant: fmtFcfa(input.amount),
        etablissement: input.establishmentName,
        statut: input.isCompleted ? "Séjour terminé" : "En cours",
        wifiName: input.wifiName,
        wifiPassword: input.wifiPassword,
      });
    }
    return assemble([
      header(input.establishmentName),
      [`Bonjour ${input.clientName},`],
      [template],
      section("Votre séjour", [
        ["Logement", input.propertyName],
        ["Arrivée", fmtDateTime(input.arrivalAt)],
        [input.isCompleted ? "Départ" : "Départ prévu", fmtDateTime(departure)],
        ["Montant du séjour", fmtFcfa(input.amount)],
      ]),
      wifi,
      closing(input.establishmentName),
    ]);
  }

  if (input.isCompleted) {
    return assemble([
      header(input.establishmentName),
      [`Bonjour ${input.clientName},`],
      ["Voici le récapitulatif de votre séjour."],
      section("Votre séjour", [
        ["Logement", input.propertyName],
        ["Arrivée", fmtDateTime(input.arrivalAt)],
        ["Départ", fmtDateTime(departure)],
        ["Montant total", fmtFcfa(input.amount)],
        ["Statut", "Séjour terminé"],
      ]),
      ["Nous vous remercions de votre visite et serons heureux de vous accueillir à nouveau."],
      closing(input.establishmentName),
    ]);
  }

  return assemble([
    header(input.establishmentName),
    [`Bonjour ${input.clientName},`],
    ["Voici les informations de votre séjour."],
    section("Votre séjour", [
      ["Logement", input.propertyName],
      ["Arrivée", fmtDateTime(input.arrivalAt)],
      ["Départ prévu", fmtDateTime(input.plannedDepartureAt)],
      ["Montant du séjour", fmtFcfa(input.amount)],
    ]),
    wifi,
    ["Nous vous remercions de votre confiance."],
    closing(input.establishmentName),
  ]);
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

/**
 * Lien WhatsApp de TEST : ouvre une conversation avec `phone` (en pratique le numéro du gérant lui-même)
 * avec le message prêt à envoyer, précédé d'une mention « TEST » pour le reconnaître. N'envoie rien :
 * le gérant valide l'envoi dans WhatsApp. Utilise le message tel qu'affiché à l'écran, même non enregistré.
 * Mention en texte simple, sans emoji : un emoji arrivait corrompu (« � ») dans WhatsApp Web.
 */
export function buildTestWhatsAppLink(phone: string | null | undefined, message: string): WhatsAppLinkResult {
  const raw = phone?.trim();
  if (!raw) return { ok: false, reason: "Saisissez le numéro WhatsApp sur lequel recevoir le test." };
  const digits = normalizeWhatsAppDigits(raw);
  if (!/^[0-9]{9,15}$/.test(digits)) return { ok: false, reason: "Numéro invalide : 9 à 15 chiffres, « + » initial possible." };
  if (!message.trim()) return { ok: false, reason: "Il n'y a pas encore de message à tester." };
  return { ok: true, url: `https://wa.me/${digits}?text=${encodeURIComponent(`TEST SAMA HOME\n\n${message}`)}` };
}
