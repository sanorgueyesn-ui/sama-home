import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EMPTY_GUEST_INFO,
  GUEST_INFO_LIMITS,
  buildGuestInfoMessage,
  buildGuestInfoWhatsAppLink,
  buildWifiQrPayload,
  escapeWifiValue,
  hasGuestInfo,
  isGuestInfoMode,
  type GuestInfoSettings,
} from "../guest-info";

const full: GuestInfoSettings = {
  wifiName: "Teranga-Almadies",
  wifiPassword: "bienvenue2026",
  tvInstructions: "Bouton rouge de la télécommande noire, puis ▲▼ pour les chaînes.",
  acInstructions: "ON/OFF, réglez 24 °C. Fermez les fenêtres.",
  houseRules: "Pas de fête après 22 h.",
  extraInfo: "Coupure d'électricité : appelez la réception.",
  checkoutTime: "Départ avant 11 h, clé à la réception.",
  includeEmergency: true,
};

const base = { clientName: "Awa Diop", establishmentName: "Résidence Teranga", propertyName: "Chambre 101", receptionPhone: "+221 77 338 66 60" };

test("réservé à l'Hôtel et à la Résidence : l'Agence immobilière est exclue", () => {
  assert.equal(isGuestInfoMode("HOTEL"), true);
  assert.equal(isGuestInfoMode("RESIDENCE"), true);
  for (const mode of ["REAL_ESTATE", "AGENCY", "", null, undefined, "hotel"]) assert.equal(isGuestInfoMode(mode), false, String(mode));
});

test("QR Wi-Fi : format ZXing, avec mot de passe", () => {
  assert.equal(buildWifiQrPayload("Teranga", "secret"), "WIFI:T:WPA;S:Teranga;P:secret;;");
});

test("QR Wi-Fi : réseau ouvert sans mot de passe, rien sans nom de réseau", () => {
  assert.equal(buildWifiQrPayload("Invités", ""), "WIFI:T:nopass;S:Invités;;");
  assert.equal(buildWifiQrPayload("Invités", null), "WIFI:T:nopass;S:Invités;;");
  assert.equal(buildWifiQrPayload("", "secret"), null);
  assert.equal(buildWifiQrPayload(null, null), null);
  assert.equal(buildWifiQrPayload("   ", "x"), null);
});

test("QR Wi-Fi : \\ ; , : \" sont échappés, la barre oblique d'abord et une seule fois", () => {
  assert.equal(escapeWifiValue('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f');
  assert.equal(buildWifiQrPayload("Réseau;1", "p:w\\d"), "WIFI:T:WPA;S:Réseau\\;1;P:p\\:w\\\\d;;");
  assert.ok(!buildWifiQrPayload("a", "b")!.endsWith("\n"), "aucune fin de ligne");
});

test("message complet : Wi-Fi en premier, puis appareils, départ, règles, urgences, réception, teranga", () => {
  const message = buildGuestInfoMessage({ ...base, settings: full });
  const order = ["Bonjour Awa Diop", "Résidence Teranga", "Wi-Fi", "Teranga-Almadies", "bienvenue2026", "Télévision", "Climatisation", "Départ", "À savoir", "Urgences au Sénégal", "Police 17 · Pompiers 18 · SAMU 1515", "Appelez la réception", "+221 77 338 66 60", "Teranga : faites comme chez vous"];
  let cursor = -1;
  for (const part of order) {
    const found = message.indexOf(part, cursor + 1);
    assert.ok(found > cursor, `« ${part} » absent ou dans le mauvais ordre`);
    cursor = found;
  }
});

test("message : un bloc vide n'apparaît pas, rien n'est inventé", () => {
  const message = buildGuestInfoMessage({
    ...base,
    receptionPhone: null,
    settings: { ...EMPTY_GUEST_INFO, wifiName: "Invités", wifiPassword: null },
  });
  assert.match(message, /Réseau : Invités/);
  assert.ok(!/Mot de passe/.test(message));
  for (const absent of ["Télévision", "Climatisation", "Départ", "À savoir", "Urgences", "réception"]) {
    assert.ok(!message.includes(absent), `« ${absent} » ne devrait pas apparaître`);
  }
});

test("les numéros d'urgence ne sont ajoutés que si l'établissement le demande", () => {
  const without = buildGuestInfoMessage({ ...base, settings: { ...full, includeEmergency: false } });
  assert.ok(!without.includes("Urgences"));
});

test("hasGuestInfo : vrai dès qu'une information utile existe, faux pour des champs vides ou blancs", () => {
  assert.equal(hasGuestInfo(EMPTY_GUEST_INFO), false);
  assert.equal(hasGuestInfo({ ...EMPTY_GUEST_INFO, wifiName: "   ", tvInstructions: "" }), false);
  assert.equal(hasGuestInfo({ ...EMPTY_GUEST_INFO, includeEmergency: true }), false, "les urgences seules ne suffisent pas");
  assert.equal(hasGuestInfo({ ...EMPTY_GUEST_INFO, acInstructions: "ON/OFF" }), true);
});

test("lien WhatsApp : numéro local sénégalais complété, refus clairs sinon", () => {
  const ok = buildGuestInfoWhatsAppLink({ ...base, settings: full, clientPhone: "771110001" });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.ok(ok.url.startsWith("https://wa.me/221771110001?text="));
    assert.ok(decodeURIComponent(ok.url).includes("Teranga-Almadies"));
  }
  const noPhone = buildGuestInfoWhatsAppLink({ ...base, settings: full, clientPhone: null });
  assert.equal(noPhone.ok, false);
  const badPhone = buildGuestInfoWhatsAppLink({ ...base, settings: full, clientPhone: "12" });
  assert.equal(badPhone.ok, false);
  const nothing = buildGuestInfoWhatsAppLink({ ...base, settings: EMPTY_GUEST_INFO, clientPhone: "771110001" });
  assert.equal(nothing.ok, false);
  if (!nothing.ok) assert.match(nothing.reason, /paramètres/);
});

test("limites : conformes à la norme Wi-Fi (32 / 63) et raisonnables pour le reste", () => {
  assert.equal(GUEST_INFO_LIMITS.wifiName, 32);
  assert.equal(GUEST_INFO_LIMITS.wifiPassword, 63);
  assert.ok(GUEST_INFO_LIMITS.instructions >= 300);
});

test("garde de source : la protection par mode est côté serveur, jamais dans le seul formulaire", () => {
  const action = readFileSync("src/app/actions/settings.ts", "utf8");
  assert.match(action, /isGuestInfoMode\(/);
  assert.match(action, /guestInfoSection/);
  const data = readFileSync("src/lib/guest-info-data.ts", "utf8");
  assert.match(data, /isGuestInfoMode\(/);
  assert.match(data, /getCurrentUser\(\)/);
});

test("validation : un champ vide efface la valeur, un champ absent la laisse inchangée", async () => {
  const { GuestInfoSchema } = await import("../definitions");
  const cleared = GuestInfoSchema.parse({
    guestWifiName: "   ",
    guestWifiPassword: "",
    guestTvInstructions: null,
    guestAcInstructions: undefined,
    guestHouseRules: "Pas de fête.",
    guestExtraInfo: "",
    guestCheckoutTime: "11 h",
    guestIncludeEmergency: null,
  });
  assert.equal(cleared.guestWifiName, null, "vide = effacé");
  assert.equal(cleared.guestWifiPassword, null);
  assert.equal(cleared.guestTvInstructions, undefined, "absent = inchangé");
  assert.equal(cleared.guestAcInstructions, undefined);
  assert.equal(cleared.guestHouseRules, "Pas de fête.");
  assert.equal(cleared.guestIncludeEmergency, false);
});

test("validation : limites Wi-Fi (32 / 63) et case des urgences", async () => {
  const { GuestInfoSchema } = await import("../definitions");
  const fields = { guestWifiName: null, guestWifiPassword: null, guestTvInstructions: null, guestAcInstructions: null, guestHouseRules: null, guestExtraInfo: null, guestCheckoutTime: null, guestIncludeEmergency: "on" };
  assert.equal(GuestInfoSchema.parse(fields).guestIncludeEmergency, true);
  assert.equal(GuestInfoSchema.safeParse({ ...fields, guestWifiName: "x".repeat(32) }).success, true);
  assert.equal(GuestInfoSchema.safeParse({ ...fields, guestWifiName: "x".repeat(33) }).success, false);
  assert.equal(GuestInfoSchema.safeParse({ ...fields, guestWifiPassword: "x".repeat(63) }).success, true);
  assert.equal(GuestInfoSchema.safeParse({ ...fields, guestWifiPassword: "x".repeat(64) }).success, false);
  assert.equal(GuestInfoSchema.safeParse({ ...fields, guestTvInstructions: "x".repeat(601) }).success, false);
});

test("lien de test WhatsApp : numéro du gérant, message préfixé « TEST », refus clairs", async () => {
  const { buildTestWhatsAppLink } = await import("../whatsapp");
  const ok = buildTestWhatsAppLink("77 733 86 66 0", "Bonjour Awa");
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.ok(ok.url.startsWith("https://wa.me/"));
    assert.match(decodeURIComponent(ok.url), /TEST SAMA HOME\n\nBonjour Awa$/);
  }
  const local = buildTestWhatsAppLink("771110001", "x");
  assert.ok(local.ok && local.url.startsWith("https://wa.me/221771110001?text="), "numéro local sénégalais complété");
  const international = buildTestWhatsAppLink("+221 77 338 66 60", "x");
  assert.ok(international.ok && international.url.startsWith("https://wa.me/221773386660?text="));
  assert.equal(buildTestWhatsAppLink("", "x").ok, false);
  assert.equal(buildTestWhatsAppLink(null, "x").ok, false);
  assert.equal(buildTestWhatsAppLink("12", "x").ok, false);
  assert.equal(buildTestWhatsAppLink("771110001", "   ").ok, false);
});

test("garde de source : le numéro de test n'est jamais envoyé au serveur ni enregistré", () => {
  const form = readFileSync("src/app/settings/settings-form.tsx", "utf8");
  const start = form.indexOf("function TestSend");
  const block = form.slice(start, form.indexOf("const BOLD_MARKERS", start) > start ? form.indexOf("const BOLD_MARKERS", start) : start + 3000);
  assert.ok(block.includes("-test-phone"), "champ de test trouvé");
  assert.ok(!/\bname=/.test(block.slice(block.indexOf("<input"), block.indexOf("/>", block.indexOf("<input")))), "le champ de test n'a pas de `name` : il n'est pas soumis");
  const action = readFileSync("src/app/actions/settings.ts", "utf8");
  assert.ok(!action.includes("test-phone") && !action.includes("testPhone"));
});
