// Route de téléchargement du contrat (src/app/locations/[id]/contract/route.ts), exécutée pour de vrai
// avec des doublures de la lecture de données et du rendu PDF. On prouve les trois issues : location
// introuvable, coordonnées de l'établissement incomplètes (renvoi vers les Paramètres, AUCUN PDF
// produit), et cas complet (PDF servi).
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Outcome = null | { missing: string[] } | { complete: true };

let outcome: Outcome = null;
let rendered = 0;

const stubs: Record<string, unknown> = {
  "@/lib/contract-data": {
    getRentalContractData: async () =>
      outcome === null
        ? null
        : "missing" in outcome
          ? outcome
          : { rental: { id: "r1" }, settings: { establishmentName: "Teranga" }, summary: {}, logoImage: null, brandColors: {} },
  },
  "@/lib/contract-pdf": {
    renderRentalContractPdf: async () => {
      rendered += 1;
      return Buffer.from("%PDF-1.3 stub");
    },
  },
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const { GET } = await import("../../app/locations/[id]/contract/route");

const call = () => GET(new Request("https://app.example/locations/r1/contract"), { params: Promise.resolve({ id: "r1" }) });

test("location introuvable (ou d'un autre établissement) : 404, aucun PDF", async () => {
  outcome = null;
  rendered = 0;
  const response = await call();
  assert.equal(response.status, 404);
  assert.equal(rendered, 0);
});

test("coordonnées incomplètes : renvoi vers les Paramètres avec explication, aucun PDF produit", async () => {
  outcome = { missing: ["phone", "address"] };
  rendered = 0;
  const response = await call();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://app.example/settings/etablissement?contrat=incomplet");
  assert.equal(rendered, 0, "aucun PDF ne doit être fabriqué avec un bailleur incomplet");
});

test("coordonnées complètes : le PDF est servi en téléchargement", async () => {
  outcome = { complete: true };
  rendered = 0;
  const response = await call();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition") ?? "", /contrat-location-r1\.pdf/);
  assert.equal(rendered, 1);
});
