// Informations d'accueil du séjour (Hôtel et Résidence uniquement) : Wi-Fi, télévision,
// climatisation, règles, départ. Module PUR (aucune base, aucune session) : la composition du
// message et le contenu du QR code se testent seuls. Les valeurs viennent de `Settings`, lues par
// `guest-info-data.ts` pour l'espace actif de la session, jamais depuis le navigateur.
import { normalizeWhatsAppDigits, type WhatsAppLinkResult } from "@/lib/whatsapp";

/** Modes pour lesquels ces informations existent : l'Agence immobilière n'héberge pas de séjour. */
export type GuestInfoMode = "HOTEL" | "RESIDENCE";

export function isGuestInfoMode(mode: string | null | undefined): mode is GuestInfoMode {
  return mode === "HOTEL" || mode === "RESIDENCE";
}

/** Limites : un SSID fait au plus 32 caractères et un mot de passe WPA 63 (norme Wi-Fi). */
export const GUEST_INFO_LIMITS = {
  wifiName: 32,
  wifiPassword: 63,
  instructions: 600,
  houseRules: 800,
  extraInfo: 600,
  checkoutTime: 40,
} as const;

export type GuestInfoSettings = {
  wifiName: string | null;
  wifiPassword: string | null;
  tvInstructions: string | null;
  acInstructions: string | null;
  houseRules: string | null;
  extraInfo: string | null;
  checkoutTime: string | null;
  includeEmergency: boolean;
};

export const EMPTY_GUEST_INFO: GuestInfoSettings = {
  wifiName: null,
  wifiPassword: null,
  tvInstructions: null,
  acInstructions: null,
  houseRules: null,
  extraInfo: null,
  checkoutTime: null,
  includeEmergency: false,
};

/** Numéros d'urgence nationaux (police 17, sapeurs-pompiers 18, SAMU 1515). */
export const SENEGAL_EMERGENCY_LINE = "Police 17 · Pompiers 18 · SAMU 1515";

const filled = (value: string | null | undefined): value is string => Boolean(value && value.trim().length > 0);

/** Vrai si au moins une information utile est renseignée (sinon il n'y a rien à envoyer). */
export function hasGuestInfo(info: GuestInfoSettings): boolean {
  return [info.wifiName, info.tvInstructions, info.acInstructions, info.houseRules, info.extraInfo, info.checkoutTime].some(filled);
}

/**
 * Échappe une valeur du format Wi-Fi des QR codes (ZXing) : `\`, `;`, `,`, `:` et `"` précédés d'une
 * barre oblique inverse. La barre oblique est traitée en même temps que les autres, une seule fois :
 * l'ordre compte, sinon les échappements déjà posés seraient échappés à leur tour.
 */
export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/**
 * Contenu du QR code de connexion : `WIFI:T:WPA;S:<réseau>;P:<mot de passe>;;`. Sans mot de passe, le
 * réseau est déclaré ouvert (`nopass`). Sans nom de réseau, il n'y a rien à encoder : `null`. Aucune
 * fin de ligne ajoutée (certains téléphones refusent alors le code).
 */
export function buildWifiQrPayload(wifiName: string | null | undefined, wifiPassword: string | null | undefined): string | null {
  if (!filled(wifiName)) return null;
  const ssid = escapeWifiValue(wifiName);
  if (!filled(wifiPassword)) return `WIFI:T:nopass;S:${ssid};;`;
  return `WIFI:T:WPA;S:${ssid};P:${escapeWifiValue(wifiPassword)};;`;
}

export type GuestInfoMessageInput = {
  clientName: string;
  establishmentName: string;
  propertyName: string;
  /** Numéro de la réception (celui de l'établissement) : joignable en cas de problème. */
  receptionPhone?: string | null;
  settings: GuestInfoSettings;
};

/**
 * Message d'accueil du séjour. Chaque bloc n'apparaît que s'il est renseigné ; rien n'est inventé.
 * Structure issue des bonnes pratiques d'accueil : le Wi-Fi d'abord (c'est la première question des
 * clients), puis les appareils, puis le départ et les règles, puis comment joindre l'équipe.
 * La touche de la maison : la teranga, l'hospitalité sénégalaise.
 */
export function buildGuestInfoMessage(input: GuestInfoMessageInput): string {
  const { settings: s } = input;
  const lines: string[] = [
    `Bonjour ${input.clientName},`,
    "",
    `Bienvenue chez ${input.establishmentName} ! Voici les informations utiles pour votre séjour (${input.propertyName}).`,
  ];

  if (filled(s.wifiName)) {
    lines.push("", "📶 *Wi-Fi*", `Réseau : ${s.wifiName.trim()}`);
    if (filled(s.wifiPassword)) lines.push(`Mot de passe : ${s.wifiPassword.trim()}`);
  }
  if (filled(s.tvInstructions)) lines.push("", "📺 *Télévision*", s.tvInstructions.trim());
  if (filled(s.acInstructions)) lines.push("", "❄️ *Climatisation*", s.acInstructions.trim());
  if (filled(s.checkoutTime)) lines.push("", "🕐 *Départ*", s.checkoutTime.trim());
  if (filled(s.houseRules) || filled(s.extraInfo)) {
    lines.push("", "📋 *À savoir*");
    if (filled(s.houseRules)) lines.push(s.houseRules.trim());
    if (filled(s.extraInfo)) lines.push(s.extraInfo.trim());
  }
  if (s.includeEmergency) lines.push("", `🚨 *Urgences au Sénégal* : ${SENEGAL_EMERGENCY_LINE}`);
  if (filled(input.receptionPhone)) lines.push("", `Besoin d'aide ? Appelez la réception : ${input.receptionPhone.trim()}`);

  lines.push("", "Teranga : faites comme chez vous. Excellent séjour !", `— L'équipe ${input.establishmentName}`);
  return lines.join("\n");
}

export function buildGuestInfoWhatsAppLink(input: GuestInfoMessageInput & { clientPhone: string | null | undefined }): WhatsAppLinkResult {
  const phone = input.clientPhone?.trim();
  if (!phone) return { ok: false, reason: "Ce client n'a pas de numéro de téléphone enregistré." };
  const digits = normalizeWhatsAppDigits(phone);
  if (!/^[0-9]{9,15}$/.test(digits)) return { ok: false, reason: "Numéro de téléphone invalide pour WhatsApp." };
  if (!hasGuestInfo(input.settings)) return { ok: false, reason: "Aucune information d'accueil n'est renseignée dans les paramètres." };
  return { ok: true, url: `https://wa.me/${digits}?text=${encodeURIComponent(buildGuestInfoMessage(input))}` };
}
