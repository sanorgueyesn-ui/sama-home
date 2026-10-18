#!/usr/bin/env -S npx tsx
/**
 * Tests ciblés et reproductibles pour le lot "Confirmation de réservation
 * par WhatsApp". Mêmes conventions que scripts/test-transfer-frequency.mts :
 * `node:assert/strict` uniquement (aucune dépendance de test installée dans
 * ce projet), fonctions pures testables hors runtime Next.js/DB.
 *
 * Usage : npx tsx scripts/test-whatsapp-link.mts
 */
import assert from "node:assert/strict";
import { buildReservationWhatsAppLink, buildReservationWhatsAppMessage } from "../src/lib/whatsapp";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

const BASE = {
  clientName: "Awa Diop",
  establishmentName: "Résidence Fatou",
  propertyName: "Chambre 02",
  arrivalAt: new Date("2026-10-12T14:00:00.000Z"),
  departureAt: new Date("2026-10-15T12:00:00.000Z"),
  durationLabel: "3 nuits",
  amount: 45000,
  deposit: 0,
};

console.log("=== Cas 1 — Numéro valide avec '+' : lien généré, '+' retiré ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: "+221771234567" });
  check("ok=true", () => assert.equal(result.ok, true));
  if (result.ok) {
    check("URL commence par https://wa.me/221771234567?text=", () =>
      assert.ok(result.url.startsWith("https://wa.me/221771234567?text=")),
    );
  }
}

console.log("=== Cas 2 — Numéro valide sans '+' : accepté tel quel ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: "221771234567" });
  check("ok=true", () => assert.equal(result.ok, true));
  if (result.ok) check("URL attendue", () => assert.ok(result.url.startsWith("https://wa.me/221771234567?text=")));
}

console.log("=== Cas 3 — Numéro absent : échec explicite, aucun lien ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: null });
  check("ok=false", () => assert.equal(result.ok, false));
  check("raison explicite", () => assert.ok(!result.ok && result.reason.length > 0));
}

console.log("=== Cas 4 — Numéro invalide (lettres) : échec explicite, aucun lien ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: "pas-un-numero" });
  check("ok=false", () => assert.equal(result.ok, false));
}

console.log("=== Cas 5 — Numéro trop court : échec explicite ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: "1234" });
  check("ok=false (trop court)", () => assert.equal(result.ok, false));
}

console.log("=== Cas 6 — Caractères accentués correctement encodés dans l'URL ===");
{
  const result = buildReservationWhatsAppLink({ ...BASE, clientPhone: "221771234567", clientName: "Aïssatou Ndéye" });
  check("ok=true", () => assert.equal(result.ok, true));
  if (result.ok) {
    check("le nom accentué n'apparaît jamais en clair dans l'URL (doit être %-encodé)", () =>
      assert.ok(!result.url.includes("Aïssatou")),
    );
    check("decodeURIComponent restitue exactement le nom accentué", () => {
      const text = decodeURIComponent(result.url.split("?text=")[1]);
      assert.ok(text.includes("Aïssatou Ndéye"));
    });
  }
}

console.log("=== Cas 7 — Acompte à 0 : ligne 'Acompte' absente du message ===");
{
  const message = buildReservationWhatsAppMessage({ ...BASE, clientPhone: "221771234567", deposit: 0 });
  check("pas de ligne acompte", () => assert.ok(!message.includes("Acompte")));
}

console.log("=== Cas 8 — Acompte > 0 : ligne 'Acompte' présente avec le bon montant ===");
{
  const message = buildReservationWhatsAppMessage({ ...BASE, clientPhone: "221771234567", deposit: 10000 });
  check("ligne acompte présente", () => assert.ok(message.includes("Acompte déjà versé : 10 000 FCFA")));
}

console.log("=== Cas 9 — Le message contient les données réelles attendues (jamais inventées) ===");
{
  const message = buildReservationWhatsAppMessage({ ...BASE, clientPhone: "221771234567" });
  check("nom du client", () => assert.ok(message.includes("Awa Diop")));
  check("établissement", () => assert.ok(message.includes("Résidence Fatou")));
  check("logement", () => assert.ok(message.includes("Chambre 02")));
  check("durée", () => assert.ok(message.includes("3 nuits")));
  check("montant total", () => assert.ok(message.includes("45 000 FCFA")));
}

console.log(`\n${passed} assertions réussies. Aucun échec.`);
