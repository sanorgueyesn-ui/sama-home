// Tests du contrôle de statut des espaces à la connexion (module pur, aucune base).
import { test } from "node:test";
import assert from "node:assert/strict";
import { blockingStatus } from "../login-gate";

test("aucun espace (compte de plateforme) : connexion permise", () => {
  assert.equal(blockingStatus([]), null);
});

test("un seul espace : même comportement qu'avant", () => {
  assert.equal(blockingStatus(["ACTIVE"]), null);
  assert.equal(blockingStatus(["PENDING"]), "PENDING");
  assert.equal(blockingStatus(["REJECTED"]), "REJECTED");
  assert.equal(blockingStatus(["SUSPENDED"]), "SUSPENDED");
});

test("plusieurs espaces dont un actif : connexion permise (les actions sur l'espace bloqué restent refusées ailleurs)", () => {
  assert.equal(blockingStatus(["SUSPENDED", "ACTIVE"]), null);
  assert.equal(blockingStatus(["PENDING", "REJECTED", "ACTIVE"]), null);
});

test("plusieurs espaces, aucun actif : refus, par ordre de priorité en attente > refusé > suspendu", () => {
  assert.equal(blockingStatus(["SUSPENDED", "PENDING"]), "PENDING");
  assert.equal(blockingStatus(["SUSPENDED", "REJECTED"]), "REJECTED");
  assert.equal(blockingStatus(["SUSPENDED", "SUSPENDED"]), "SUSPENDED");
});
