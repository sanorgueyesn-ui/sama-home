import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRentalWhatsAppLink,
  buildRentalWhatsAppMessage,
  buildReservationWhatsAppLink,
  buildReservationWhatsAppMessage,
  buildTestWhatsAppLink,
} from "../whatsapp";
import { buildGuestInfoMessage, EMPTY_GUEST_INFO } from "../guest-info";

// Jeudi 29 octobre 2026, 14 h ; samedi 31 octobre 2026, 11 h.
const arrival = new Date(2026, 9, 29, 14, 0);
const departure = new Date(2026, 9, 31, 11, 0);

const reservation = {
  clientName: "Awa Diop",
  clientPhone: "771110001",
  establishmentName: "Résidence Teranga Almadies",
  propertyName: "Chambre 101",
  arrivalAt: arrival,
  departureAt: departure,
  durationLabel: "2 nuits",
  amount: 36000,
  deposit: 10000,
};

const rental = {
  clientName: "Awa Diop",
  clientPhone: "771110001",
  establishmentName: "Résidence Teranga Almadies",
  propertyName: "Chambre 101",
  arrivalAt: arrival,
  plannedDepartureAt: departure,
  amount: 36000,
};

const WELCOME = "Nous sommes ravis de vous accueillir.";

/** Aucun caractère hors du texte courant : ni emoji, ni symbole pictographique (ils arrivaient corrompus dans WhatsApp Web). */
const EMOJI = /\p{Extended_Pictographic}/u;

test("réservation avec texte personnalisé : en-tête, salutation, texte, séjour, politesse — sans emoji", () => {
  const message = buildReservationWhatsAppMessage({ ...reservation, customTemplate: WELCOME });
  assert.equal(
    message,
    [
      "*RÉSIDENCE TERANGA ALMADIES*",
      "",
      "Bonjour Awa Diop,",
      "",
      WELCOME,
      "",
      "*Votre séjour*",
      "Logement : Chambre 101",
      "Arrivée : jeudi 29 octobre 2026 à 14 h 00",
      "Départ : samedi 31 octobre 2026 à 11 h 00",
      "Montant total : 36 000 FCFA",
      "Acompte versé : 10 000 FCFA",
      "",
      "Cordialement,",
      "Résidence Teranga Almadies",
    ].join("\n"),
  );
  assert.ok(!EMOJI.test(message));
});

test("Wi-Fi : nom et mot de passe apparaissent quand ils sont renseignés", () => {
  const message = buildReservationWhatsAppMessage({
    ...reservation,
    customTemplate: WELCOME,
    wifiName: "Teranga-Almadies",
    wifiPassword: "bienvenue2026",
  });
  assert.match(message, /\*Connexion Wi-Fi\*\nRéseau : Teranga-Almadies\nMot de passe : bienvenue2026/);
  // Le Wi-Fi vient après le séjour et avant la politesse.
  assert.ok(message.indexOf("Connexion Wi-Fi") > message.indexOf("Votre séjour"));
  assert.ok(message.indexOf("Connexion Wi-Fi") < message.indexOf("Cordialement"));
});

test("Wi-Fi : réseau ouvert (sans mot de passe) et absence de Wi-Fi n'inventent rien", () => {
  const open = buildReservationWhatsAppMessage({ ...reservation, customTemplate: WELCOME, wifiName: "Invités", wifiPassword: "   " });
  assert.match(open, /Réseau : Invités/);
  assert.ok(!/Mot de passe/.test(open));
  for (const wifiName of [null, undefined, "", "   "]) {
    const none = buildReservationWhatsAppMessage({ ...reservation, customTemplate: WELCOME, wifiName, wifiPassword: "secret" });
    assert.ok(!none.includes("Wi-Fi") && !none.includes("secret"), `Wi-Fi inattendu pour ${JSON.stringify(wifiName)}`);
  }
});

test("texte avec variables : seules les variables sont remplacées, y compris le Wi-Fi", () => {
  const message = buildReservationWhatsAppMessage({
    ...reservation,
    customTemplate: "Bonjour {client}, {logement}, réseau {wifi}, code {motdepasse}.",
    wifiName: "Teranga-Almadies",
    wifiPassword: "bienvenue2026",
  });
  assert.equal(message, "Bonjour Awa Diop, Chambre 101, réseau Teranga-Almadies, code bienvenue2026.");
  const without = buildReservationWhatsAppMessage({ ...reservation, customTemplate: "Réseau {wifi}." });
  assert.equal(without, "Réseau .");
});

test("réservation sans texte personnalisé : confirmation complète, durée, statut, sans emoji", () => {
  const message = buildReservationWhatsAppMessage({ ...reservation, statusLabel: "Confirmée" });
  assert.match(message, /Nous avons le plaisir de vous confirmer votre réservation\./);
  assert.match(message, /Durée : 2 nuits/);
  assert.match(message, /Statut : Confirmée/);
  assert.match(message, /Acompte versé : 10 000 FCFA/);
  assert.ok(!EMOJI.test(message));
  assert.ok(message.endsWith("Cordialement,\nRésidence Teranga Almadies"));
});

test("pas d'acompte : la ligne n'apparaît pas", () => {
  const message = buildReservationWhatsAppMessage({ ...reservation, deposit: 0, customTemplate: WELCOME });
  assert.ok(!message.includes("Acompte"));
});

test("nom d'établissement vide : ni en-tête vide ni signature vide", () => {
  const message = buildReservationWhatsAppMessage({ ...reservation, establishmentName: "  ", customTemplate: WELCOME });
  assert.ok(message.startsWith("Bonjour Awa Diop,"));
  assert.ok(message.endsWith("Cordialement,"));
});

test("location en cours : Wi-Fi inclus ; séjour terminé : jamais de Wi-Fi", () => {
  const wifi = { wifiName: "Teranga-Almadies", wifiPassword: "bienvenue2026" };
  const running = buildRentalWhatsAppMessage({ ...rental, ...wifi, customTemplate: WELCOME });
  assert.match(running, /Départ prévu : samedi 31 octobre 2026 à 11 h 00/);
  assert.match(running, /Mot de passe : bienvenue2026/);

  const done = buildRentalWhatsAppMessage({ ...rental, ...wifi, isCompleted: true, actualDepartureAt: new Date(2026, 9, 31, 9, 30), customTemplate: WELCOME });
  assert.ok(!done.includes("Wi-Fi"));
  assert.match(done, /Départ : samedi 31 octobre 2026 à 09 h 30/);

  const doneDefault = buildRentalWhatsAppMessage({ ...rental, ...wifi, isCompleted: true });
  assert.ok(!doneDefault.includes("Wi-Fi"));
  assert.match(doneDefault, /Séjour terminé/);
  assert.match(doneDefault, /serons heureux de vous accueillir à nouveau/);
  for (const text of [running, done, doneDefault, buildRentalWhatsAppMessage(rental)]) assert.ok(!EMOJI.test(text));
});

test("liens : le message complet, accents compris, survit à l'encodage de l'adresse", () => {
  const resa = buildReservationWhatsAppLink({ ...reservation, customTemplate: WELCOME, wifiName: "Réseau é", wifiPassword: "p@ss" });
  assert.ok(resa.ok);
  if (resa.ok) {
    assert.ok(resa.url.startsWith("https://wa.me/221771110001?text="));
    assert.equal(decodeURIComponent(resa.url.split("?text=")[1]), buildReservationWhatsAppMessage({ ...reservation, customTemplate: WELCOME, wifiName: "Réseau é", wifiPassword: "p@ss" }));
    assert.ok(!/%F0%9F/i.test(resa.url), "aucun emoji (séquence UTF-8 de 4 octets) dans le lien");
  }
  const loc = buildRentalWhatsAppLink({ ...rental, clientPhone: "12" });
  assert.equal(loc.ok, false);
});

test("lien de test : mention TEST en texte simple, sans emoji", () => {
  const link = buildTestWhatsAppLink("771110001", "Bonjour");
  assert.ok(link.ok);
  if (link.ok) {
    const text = decodeURIComponent(link.url.split("?text=")[1]);
    assert.equal(text, "TEST SAMA HOME\n\nBonjour");
    assert.ok(!EMOJI.test(text));
  }
});

test("message des informations pratiques : même présentation, rubriques en gras, sans emoji", () => {
  const message = buildGuestInfoMessage({
    clientName: "Awa Diop",
    establishmentName: "Résidence Teranga Almadies",
    propertyName: "Chambre 101",
    receptionPhone: "+221 77 000 00 00",
    settings: { ...EMPTY_GUEST_INFO, wifiName: "Teranga-Almadies", wifiPassword: "bienvenue2026", checkoutTime: "Départ avant 11 h" },
  });
  assert.ok(message.startsWith("*RÉSIDENCE TERANGA ALMADIES*\n\nBonjour Awa Diop,"));
  assert.match(message, /\*Connexion Wi-Fi\*\nRéseau : Teranga-Almadies\nMot de passe : bienvenue2026/);
  assert.match(message, /\*Départ\*\nDépart avant 11 h/);
  assert.ok(message.endsWith("Cordialement,\nRésidence Teranga Almadies"));
  assert.ok(!EMOJI.test(message));
});
