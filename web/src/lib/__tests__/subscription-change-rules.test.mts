// Lot 3B, étapes 1 et A — règles pures : validations numériques, textes et clé d'idempotence,
// seuil de double validation des remboursements, séparation demandeur / décideur.
//
// Isolation : module pur, AUCUNE base, AUCUN réseau, AUCUNE doublure nécessaire.
import test from "node:test";
import assert from "node:assert/strict";

const rules = await import("../subscription-change-rules");

const ok = (r: { valid: boolean }) => r.valid === true;
const errorOf = (r: object): string => ("error" in r ? String((r as { error: unknown }).error) : "");
const valueOf = (r: object): unknown => ("value" in r ? (r as { value: unknown }).value : undefined);

test("constantes : bornes et seuil validés", () => {
  assert.equal(rules.MANUAL_PAYMENT_MIN_FCFA, 100);
  assert.equal(rules.MANUAL_PAYMENT_MAX_FCFA, 10_000_000);
  assert.equal(rules.MANUAL_PAYMENT_MIN_MONTHS, 1);
  assert.equal(rules.MANUAL_PAYMENT_MAX_MONTHS, 36);
  assert.equal(rules.PROLONGATION_MIN_DAYS, 1);
  assert.equal(rules.PROLONGATION_MAX_DAYS, 366);
  assert.equal(rules.REFUND_DOUBLE_VALIDATION_THRESHOLD_FCFA, 50_000);
  assert.equal(rules.IDEMPOTENCY_KEY_MIN_LENGTH, 16);
  assert.equal(rules.IDEMPOTENCY_KEY_MAX_LENGTH, 64);
  assert.equal(rules.REFERENCE_MAX_LENGTH, 200);
  assert.equal(rules.REASON_MAX_LENGTH, 500);
});

test("anciens noms trompeurs supprimés : la durée en mois ne concerne que le paiement manuel", () => {
  const exported = Object.keys(rules);
  assert.equal(exported.includes("validateProlongationMonths"), false);
  assert.equal(exported.includes("PROLONGATION_MIN_MONTHS"), false);
  assert.equal(exported.includes("PROLONGATION_MAX_MONTHS"), false);
  assert.equal(exported.includes("areRequesterAndApproverDistinct"), false);
  assert.equal(typeof rules.validateManualPaymentMonths, "function");
  assert.equal(typeof rules.areRequesterAndDeciderDistinct, "function");
});

const NOT_INTEGERS: unknown[] = [
  100.5, 1.5, 0.1, 1e-7, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 2 ** 60,
  "100", "9900", "1", "  ", "", "abc", "1e3", null, undefined, true, false, {}, [], [100], { valueOf: () => 100 },
  BigInt(10),
];

function checkBoundedRule(
  name: string,
  validate: (v: unknown) => { valid: boolean; value?: number; error?: string },
  min: number,
  max: number,
) {
  test(`${name} : bornes incluses acceptées`, () => {
    for (const v of [min, min + 1, max - 1, max]) {
      const r = validate(v);
      assert.equal(ok(r), true, `${v} doit être valide`);
      assert.equal(r.value, v);
    }
  });

  test(`${name} : bornes exclues et hors plage refusées`, () => {
    for (const v of [min - 1, max + 1, 0, -1, -min, -max, max * 10]) {
      if (v >= min && v <= max) continue; // 0 / -1 peuvent coïncider avec min - 1 selon la règle
      const r = validate(v);
      assert.equal(ok(r), false, `${v} doit être refusé`);
      assert.equal(typeof r.error, "string");
      assert.match(r.error ?? "", new RegExp(`${min}`));
    }
  });

  test(`${name} : décimaux, chaînes, null, NaN et types inattendus refusés`, () => {
    for (const v of NOT_INTEGERS) {
      const r = validate(v);
      assert.equal(ok(r), false, `${String(v)} (${typeof v}) doit être refusé`);
      assert.match(r.error ?? "", /entier/);
    }
  });
}

checkBoundedRule("montant du paiement manuel", rules.validateManualPaymentAmountFcfa, 100, 10_000_000);
checkBoundedRule("durée du paiement manuel en mois", rules.validateManualPaymentMonths, 1, 36);
checkBoundedRule("prolongation en jours", rules.validateProlongationDays, 1, 366);

test("montant du paiement manuel : cas précis autour des bornes", () => {
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(99)), false);
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(100)), true);
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(10_000_000)), true);
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(10_000_001)), false);
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(0)), false);
  assert.equal(ok(rules.validateManualPaymentAmountFcfa(-100)), false);
});

test("durée du paiement en mois et prolongation en jours : cas précis autour des bornes", () => {
  assert.equal(ok(rules.validateManualPaymentMonths(0)), false);
  assert.equal(ok(rules.validateManualPaymentMonths(1)), true);
  assert.equal(ok(rules.validateManualPaymentMonths(36)), true);
  assert.equal(ok(rules.validateManualPaymentMonths(37)), false);
  assert.equal(ok(rules.validateProlongationDays(0)), false);
  assert.equal(ok(rules.validateProlongationDays(1)), true);
  assert.equal(ok(rules.validateProlongationDays(366)), true);
  assert.equal(ok(rules.validateProlongationDays(367)), false);
});

test("seuil de double validation : 49 999 non, 50 000 oui (inclus), 50 001 oui", () => {
  assert.equal(rules.refundRequiresDoubleValidation(49_999), false);
  assert.equal(rules.refundRequiresDoubleValidation(50_000), true);
  assert.equal(rules.refundRequiresDoubleValidation(50_001), true);
});

test("seuil de double validation : petits et grands montants valides", () => {
  assert.equal(rules.refundRequiresDoubleValidation(1), false);
  assert.equal(rules.refundRequiresDoubleValidation(100), false);
  assert.equal(rules.refundRequiresDoubleValidation(10_000), false);
  assert.equal(rules.refundRequiresDoubleValidation(1_000_000), true);
  assert.equal(rules.refundRequiresDoubleValidation(Number.MAX_SAFE_INTEGER), true);
});

test("seuil de double validation : un montant invalide ne contourne jamais la double validation", () => {
  const invalid: unknown[] = [
    0, -1, -50_000, 49_999.5, 50_000.5, 0.5, NaN, Infinity, -Infinity,
    "49999", "50000", "", null, undefined, true, {}, [], [50_000], BigInt(50_000),
  ];
  for (const v of invalid) {
    assert.equal(rules.refundRequiresDoubleValidation(v), true, `${String(v)} (${typeof v}) doit exiger la double validation`);
  }
});

test("demandeur et décideur distincts : identités différentes acceptées", () => {
  assert.equal(rules.areRequesterAndDeciderDistinct("admin-1", "admin-2"), true);
  assert.equal(rules.areRequesterAndDeciderDistinct("clx1", "clx2"), true);
  assert.equal(rules.areRequesterAndDeciderDistinct("Admin-1", "admin-1"), true, "comparaison exacte, sensible à la casse");
});

test("demandeur et décideur identiques : refus", () => {
  assert.equal(rules.areRequesterAndDeciderDistinct("admin-1", "admin-1"), false);
  assert.equal(rules.areRequesterAndDeciderDistinct("x", "x"), false);
});

test("identité absente ou invalide : refus par défaut, jamais d'accord par défaut", () => {
  const bad: unknown[] = [null, undefined, "", "   ", "\t", 1, 0, true, {}, [], ["a"], BigInt(10)];
  for (const v of bad) {
    assert.equal(rules.areRequesterAndDeciderDistinct(v, "admin-2"), false, `demandeur ${String(v)}`);
    assert.equal(rules.areRequesterAndDeciderDistinct("admin-1", v), false, `approbateur ${String(v)}`);
    assert.equal(rules.areRequesterAndDeciderDistinct(v, v), false, `les deux ${String(v)}`);
  }
});

test("demandeur et décideur : l'égalité ne contourne pas par espaces (pas de normalisation)", () => {
  // Pas de trim sur les identifiants : " admin-1" et "admin-1" sont des identités différentes,
  // mais aucun identifiant réel n'en contient (cuid). Documenté pour que ce comportement soit voulu.
  assert.equal(rules.areRequesterAndDeciderDistinct(" admin-1", "admin-1"), true);
});

const NOT_TEXT: unknown[] = [0, 1, NaN, true, false, {}, [], ["a"], () => "a", BigInt(1), Symbol("a")];
const WHITESPACE_ONLY = ["", " ", "   ", "\t", "\n", " \t\n ", " ", " "];

function checkOptionalText(name: string, validate: (v: unknown) => { valid: boolean; value?: unknown; error?: string }, max: number) {
  test(`${name} : absent, vide ou composé d'espaces → accepté comme absence (null)`, () => {
    for (const v of [undefined, null, ...WHITESPACE_ONLY]) {
      const r = validate(v);
      assert.equal(ok(r), true, `${JSON.stringify(v)} doit être accepté`);
      assert.equal(r.value, null, `${JSON.stringify(v)} doit devenir null`);
    }
  });

  test(`${name} : texte nettoyé (espaces de début et de fin supprimés)`, () => {
    const r = validate("  Wave TX-892183  ");
    assert.equal(ok(r), true);
    assert.equal(r.value, "Wave TX-892183");
    assert.equal(validate("a  b").value, "a  b", "les espaces internes sont conservés");
  });

  test(`${name} : limite de ${max} caractères incluse, ${max + 1} refusé`, () => {
    assert.equal(ok(validate("x".repeat(max))), true);
    assert.equal(ok(validate("x".repeat(max + 1))), false);
    assert.match(validate("x".repeat(max + 1)).error ?? "", new RegExp(String(max)));
    // Les espaces de début et de fin ne comptent pas dans la longueur.
    assert.equal(ok(validate("  " + "x".repeat(max) + "  ")), true);
    // Longueur en caractères Unicode (points de code), comme char_length de PostgreSQL.
    assert.equal(ok(validate("😀".repeat(max))), true, "un émoji compte pour 1 caractère");
    assert.equal(ok(validate("😀".repeat(max + 1))), false);
    assert.equal(ok(validate("é".repeat(max))), true);
  });

  test(`${name} : types non textuels et caractère NUL refusés`, () => {
    for (const v of NOT_TEXT) {
      assert.equal(ok(validate(v)), false, `${typeof v} doit être refusé`);
    }
    assert.equal(ok(validate("abc\u0000def")), false);
    assert.equal(ok(validate("\u0000")), false);
  });
}

checkOptionalText("référence", rules.validateReference, 200);
checkOptionalText("motif général", rules.validateReason, 500);

test("motif de rejet : obligatoire, jamais vide ni composé d'espaces", () => {
  for (const v of [undefined, null, ...WHITESPACE_ONLY]) {
    const r = rules.validateRejectionReason(v);
    assert.equal(ok(r), false, `${JSON.stringify(v)} doit être refusé`);
  }
  assert.match(errorOf(rules.validateRejectionReason("   ")), /obligatoire/);
  assert.match(errorOf(rules.validateRejectionReason(undefined)), /texte/);
});

test("motif de rejet : texte nettoyé, limite de 500 caractères incluse", () => {
  const r = rules.validateRejectionReason("  Paiement non reçu  ");
  assert.equal(ok(r), true);
  assert.equal(valueOf(r), "Paiement non reçu");
  assert.equal(ok(rules.validateRejectionReason("x".repeat(500))), true);
  assert.equal(ok(rules.validateRejectionReason("x".repeat(501))), false);
  assert.equal(ok(rules.validateRejectionReason("  " + "x".repeat(500) + "  ")), true);
  assert.equal(ok(rules.validateRejectionReason("😀".repeat(500))), true);
  assert.equal(ok(rules.validateRejectionReason("😀".repeat(501))), false);
});

test("motif de rejet : types non textuels et caractère NUL refusés", () => {
  for (const v of NOT_TEXT) {
    assert.equal(ok(rules.validateRejectionReason(v)), false, `${typeof v} doit être refusé`);
  }
  assert.equal(ok(rules.validateRejectionReason("motif\u0000")), false);
});

test("clé d'idempotence : longueurs 16 et 64 incluses, 15 et 65 refusées", () => {
  for (const n of [16, 17, 32, 63, 64]) {
    const r = rules.validateIdempotencyKey("a".repeat(n));
    assert.equal(ok(r), true, `${n} caractères`);
    assert.equal(valueOf(r), "a".repeat(n));
  }
  for (const n of [0, 1, 15, 65, 100]) {
    assert.equal(ok(rules.validateIdempotencyKey("a".repeat(n))), false, `${n} caractères`);
  }
});

test("clé d'idempotence : alphabet autorisé (lettres, chiffres, - et _)", () => {
  assert.equal(ok(rules.validateIdempotencyKey("Abc-123_xyz-ABC_0123")), true);
  assert.equal(ok(rules.validateIdempotencyKey("550e8400-e29b-41d4-a716-446655440000")), true, "UUID");
  const forbidden = [
    "abcdefghijklmnop ", " abcdefghijklmnop", "abcdefgh ijklmnop", "abcdefghijklmnop\n", "abcdefghijklmnop\t",
    "abcdefghijklmno.p", "abcdefghijklmno/p", "abcdefghijklmno+p", "abcdefghijklmno=p", "abcdefghijklmno%p",
    "abcdefghijklmnoé", "abcdefghijklmno😀", "abcdefghijklmno\u0000", "abcdefghijklmno;p", "abcdefghijklmno'p",
    "                ", "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t",
  ];
  for (const v of forbidden) {
    assert.equal(ok(rules.validateIdempotencyKey(v)), false, JSON.stringify(v));
  }
});

test("clé d'idempotence : types non textuels refusés, aucune normalisation", () => {
  for (const v of [undefined, null, 0, 1234567890123456, true, {}, [], ["a".repeat(16)], BigInt(1), Symbol("a")]) {
    assert.equal(ok(rules.validateIdempotencyKey(v)), false, `${typeof v}`);
  }
  assert.equal(ok(rules.validateIdempotencyKey(" " + "a".repeat(16))), false, "pas de suppression d'espaces");
});

test("module pur : aucune dépendance serveur ni base", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../subscription-change-rules.ts", import.meta.url), "utf8");
  assert.equal(/^\s*import\s/m.test(src), false, "aucun import");
  assert.equal(/server-only|prisma|process\.env/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), false);
});
