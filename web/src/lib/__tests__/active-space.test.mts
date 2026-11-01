// Tests du choix de l'espace actif (lot B du socle multi-espaces). Module pur : aucune base.
import { test } from "node:test";
import assert from "node:assert/strict";
import { needsSpaceSelection, pickActiveMembership, resolveEstablishmentIdentity } from "../active-space";

const A = { establishmentId: "A", role: "ADMIN" as const };
const B = { establishmentId: "B", role: "GESTIONNAIRE" as const };

test("un seul espace, session sans espace actif : cet espace", () => {
  assert.deepEqual(pickActiveMembership([A], null), A);
  assert.deepEqual(pickActiveMembership([A], undefined), A);
});

test("deux espaces, espace actif valide : celui de la session", () => {
  assert.deepEqual(pickActiveMembership([A, B], "B"), B);
  assert.deepEqual(pickActiveMembership([A, B], "A"), A);
});

test("deux espaces sans espace actif : aucun (le sélecteur décidera)", () => {
  assert.equal(pickActiveMembership([A, B], null), null);
});

test("espace actif RÉVOQUÉ (plus d'appartenance) : jamais accordé", () => {
  // La colonne de session est périmée : l'utilisateur n'appartient plus à "B", il ne lui reste que "A".
  assert.deepEqual(pickActiveMembership([A], "B"), A);
  // Avec deux espaces restants et un actif inconnu : aucun, pas un choix arbitraire.
  const C = { establishmentId: "C", role: "ADMIN" as const };
  assert.equal(pickActiveMembership([A, C], "B"), null);
});

test("identifiant d'espace forgé : ignoré, jamais accordé", () => {
  assert.equal(pickActiveMembership([A, B], "Z"), null);
  assert.equal(pickActiveMembership([], "Z"), null);
});

test("aucune appartenance : aucun espace", () => {
  assert.equal(pickActiveMembership([], null), null);
});

test("identité : le rôle est celui de l'espace actif (ADMIN dans A, simple gestionnaire dans B)", () => {
  const base = { isPlatformAdmin: false, legacyRole: "ADMIN" as const, memberships: [A, B] };
  assert.deepEqual(resolveEstablishmentIdentity({ ...base, activeEstablishmentId: "A" }), {
    establishmentId: "A",
    role: "ADMIN",
  });
  assert.deepEqual(resolveEstablishmentIdentity({ ...base, activeEstablishmentId: "B" }), {
    establishmentId: "B",
    role: "GESTIONNAIRE",
  });
});

test("identité : User.role historique ne donne JAMAIS un rôle dans un autre espace", () => {
  const identity = resolveEstablishmentIdentity({
    isPlatformAdmin: false,
    legacyRole: "ADMIN",
    memberships: [B],
    activeEstablishmentId: null,
  });
  assert.deepEqual(identity, { establishmentId: "B", role: "GESTIONNAIRE" });
});

test("identité : compte d'établissement sans appartenance = aucun accès, même avec un rôle historique", () => {
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: false, legacyRole: "ADMIN", memberships: [], activeEstablishmentId: null }),
    { establishmentId: null, role: null },
  );
});

test("identité : compte de plateforme sans appartenance garde son rôle historique, sans espace", () => {
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: true, legacyRole: "ADMIN", memberships: [], activeEstablishmentId: null }),
    { establishmentId: null, role: "ADMIN" },
  );
});

test("identité : plusieurs espaces sans choix valide = aucun accès (pas de repli sur le rôle historique)", () => {
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: false, legacyRole: "ADMIN", memberships: [A, B], activeEstablishmentId: null }),
    { establishmentId: null, role: null },
  );
  // Même pour un compte de plateforme qui aurait des appartenances : pas de rôle historique.
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: true, legacyRole: "ADMIN", memberships: [A, B], activeEstablishmentId: null }),
    { establishmentId: null, role: null },
  );
});

test("espace actif vide (chaîne vide) : traité comme absent", () => {
  assert.deepEqual(pickActiveMembership([A], ""), A);
  assert.equal(pickActiveMembership([A, B], ""), null);
});

test("compte de plateforme sans appartenance NI rôle historique : aucun rôle", () => {
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: true, legacyRole: null, memberships: [], activeEstablishmentId: null }),
    { establishmentId: null, role: null },
  );
});

test("compte de plateforme avec UNE appartenance : l'appartenance prime sur le rôle historique", () => {
  const identity = (activeEstablishmentId: string | null) =>
    resolveEstablishmentIdentity({ isPlatformAdmin: true, legacyRole: "ADMIN", memberships: [B], activeEstablishmentId });
  assert.deepEqual(identity(null), { establishmentId: "B", role: "GESTIONNAIRE" });
  assert.deepEqual(identity("B"), { establishmentId: "B", role: "GESTIONNAIRE" });
});

test("compte de plateforme multi-appartenances, espace actif révoqué : aucun rôle", () => {
  assert.deepEqual(
    resolveEstablishmentIdentity({ isPlatformAdmin: true, legacyRole: "ADMIN", memberships: [A, B], activeEstablishmentId: "Z" }),
    { establishmentId: null, role: null },
  );
});

test("sélection requise : plusieurs espaces sans choix valide seulement", () => {
  assert.equal(needsSpaceSelection([A, B], null), true);
  assert.equal(needsSpaceSelection([A, B], "Z"), true); // forgé ou révoqué
  assert.equal(needsSpaceSelection([A, B], "A"), false);
  assert.equal(needsSpaceSelection([A], null), false); // un seul espace : rien à choisir
  assert.equal(needsSpaceSelection([], null), false); // aucun espace : rien à choisir
});
