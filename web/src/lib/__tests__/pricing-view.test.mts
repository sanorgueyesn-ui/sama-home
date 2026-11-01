// Tests de l'indicateur `isConfigured` et des valeurs de repli tarifaires.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une doublure en
// mémoire qui n'expose QUE `pricingSettings.findUnique` : toute tentative d'écriture
// (create, upsert, update…) lèverait une erreur et ferait échouer le test. Ces tests
// prouvent la logique de lecture ; ils ne prouvent pas le comportement avec PostgreSQL.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";

type Row = { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number } | null;
let row: Row = null;
const reads: string[] = [];

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: {
      pricingSettings: {
        findUnique: async (args: { where: { id: string } }) => {
          reads.push(args.where.id);
          return row;
        },
      },
    },
  },
  "@/lib/dal": { requirePlatformAdmin: async () => ({ id: "u", isPlatformAdmin: true }) },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const defaults = await import("../pricing-defaults");
const data = await import("../platform-settings-data");

test("valeurs de repli inchangées : 2 mois d'essai, 3 mois par période, 9 900 FCFA", () => {
  assert.equal(defaults.DEFAULT_TRIAL_DURATION_MONTHS, 2);
  assert.equal(defaults.DEFAULT_PERIOD_MONTHS, 3);
  assert.equal(defaults.DEFAULT_PERIOD_PRICE_FCFA, 9900);
});

test("les valeurs de repli sont identiques aux @default du modèle PricingSettings (schema.prisma)", () => {
  const schema = fs.readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");
  const model = /model PricingSettings \{([\s\S]*?)\n\}/.exec(schema)?.[1] ?? "";
  assert.match(model, new RegExp(`trialDurationMonths\\s+Int\\s+@default\\(${defaults.DEFAULT_TRIAL_DURATION_MONTHS}\\)`));
  assert.match(model, new RegExp(`periodMonths\\s+Int\\s+@default\\(${defaults.DEFAULT_PERIOD_MONTHS}\\)`));
  assert.match(model, new RegExp(`periodPriceFcfa\\s+Int\\s+@default\\(${defaults.DEFAULT_PERIOD_PRICE_FCFA}\\)`));
});

test("subscription-data réexporte exactement les mêmes constantes (source unique)", () => {
  const source = fs.readFileSync(new URL("../subscription-data.ts", import.meta.url), "utf8");
  assert.match(source, /from "@\/lib\/pricing-defaults"/);
  assert.doesNotMatch(source, /export const DEFAULT_(TRIAL_DURATION_MONTHS|PERIOD_MONTHS|PERIOD_PRICE_FCFA)\s*=/);
});

test("resolvePricingView : aucune ligne → valeurs de repli, isConfigured=false", () => {
  assert.deepEqual(data.resolvePricingView(null), {
    trialDurationMonths: 2,
    periodMonths: 3,
    periodPriceFcfa: 9900,
    isConfigured: false,
  });
});

test("resolvePricingView : ligne présente → ses valeurs, isConfigured=true (même si elles égalent les valeurs de repli)", () => {
  assert.deepEqual(data.resolvePricingView({ trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 }), {
    trialDurationMonths: 1,
    periodMonths: 6,
    periodPriceFcfa: 15000,
    isConfigured: true,
  });
  assert.equal(data.resolvePricingView({ trialDurationMonths: 2, periodMonths: 3, periodPriceFcfa: 9900 }).isConfigured, true);
});

test("getPublicPricingSettings : lecture seule, distingue ligne absente et ligne présente", async () => {
  row = null;
  reads.length = 0;
  const absent = await data.getPublicPricingSettings();
  assert.equal(absent.isConfigured, false);
  assert.equal(absent.periodPriceFcfa, 9900);

  row = { trialDurationMonths: 4, periodMonths: 12, periodPriceFcfa: 30000 };
  const present = await data.getPublicPricingSettings();
  assert.equal(present.isConfigured, true);
  assert.equal(present.periodPriceFcfa, 30000);
  assert.deepEqual(reads, ["singleton", "singleton"]); // uniquement des lectures de la ligne singleton
});

test("getPricingSettings (console de plateforme) expose aussi l'indicateur", async () => {
  row = null;
  assert.equal((await data.getPricingSettings()).isConfigured, false);
});

test("plus de littéral tarifaire dupliqué dans les écrans et actions concernés", () => {
  const files = [
    "../../app/actions/establishment-registration.ts",
    "../../app/register/register-form.tsx",
    "../../app/plateforme/parametres/page.tsx",
    "../../app/plateforme/abonnements/subscription-actions.tsx",
  ];
  for (const f of files) {
    const text = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /\?\? ?(2|3|9900)\b/, `${f} : valeur de repli codée en dur`);
    assert.doesNotMatch(code, /useState\("(9900|3)"\)/, `${f} : préremplissage codé en dur`);
  }
});
