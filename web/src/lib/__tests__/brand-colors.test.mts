import test from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_PALETTES,
  DEFAULT_BRAND_COLORS,
  SURFACE_DARK,
  SURFACE_LIGHT,
  checkBrandContrast,
  contrastRatio,
  displayAccentText,
  displayPrimary,
  normalizeHexColor,
  resolveBrandColors,
  resolvePaletteId,
} from "../brand-colors";

test("cinq palettes, identifiants uniques, la classique en tête et par défaut", () => {
  assert.equal(BRAND_PALETTES.length, 5);
  assert.equal(new Set(BRAND_PALETTES.map((p) => p.id)).size, 5);
  assert.equal(BRAND_PALETTES[0].id, "default");
  assert.deepEqual(DEFAULT_BRAND_COLORS, { primary: "#12304A", secondary: "#E5484D", accent: "#F59E0B" });
});

test("les quatre combinaisons demandées sont présentes avec leurs codes exacts", () => {
  const byId = Object.fromEntries(BRAND_PALETTES.map((p) => [p.id, p.colors]));
  assert.deepEqual(byId["terre-lavande"], { primary: "#6B4F3B", secondary: "#C0C0C0", accent: "#D8B4FE" });
  assert.deepEqual(byId["noir-jaune-violet"], { primary: "#000000", secondary: "#8A2BE2", accent: "#FFD600" });
  assert.deepEqual(byId["aubergine-dore"], { primary: "#4B0082", secondary: "#C0C0C0", accent: "#D4AF37" });
  assert.deepEqual(byId["noir-electrique"], { primary: "#000000", secondary: "#007BFF", accent: "#FF073A" });
});

test("chaque couleur est un #RRGGBB valide et chaque palette est nommée", () => {
  for (const palette of BRAND_PALETTES) {
    for (const key of ["primary", "secondary", "accent"] as const) {
      assert.equal(normalizeHexColor(palette.colors[key]), palette.colors[key], `${palette.id}.${key}`);
      assert.ok(palette.names[key].length > 0);
    }
    assert.ok(palette.label.length > 0 && palette.description.length > 0);
  }
});

test("rôles respectés : texte blanc lisible sur la principale, texte sombre lisible sur l'accent", () => {
  for (const palette of BRAND_PALETTES) {
    const check = checkBrandContrast(palette.colors);
    assert.equal(check.primary.ok, true, `${palette.id} : principale trop claire (${check.primary.ratio.toFixed(2)})`);
    assert.equal(check.accent.ok, true, `${palette.id} : accent trop sombre (${check.accent.ratio.toFixed(2)})`);
  }
});

test("une couleur mal choisie est signalée avec un message clair", () => {
  const check = checkBrandContrast({ primary: "#FFFFFF", secondary: "#000000", accent: "#000000" });
  assert.equal(check.primary.ok, false);
  assert.match(check.primary.message, /plus foncée/);
  assert.equal(check.accent.ok, false);
  assert.match(check.accent.message, /plus claire/);
});

test("contraste : valeurs de référence WCAG", () => {
  assert.ok(Math.abs(contrastRatio("#000000", "#FFFFFF") - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio("#FFFFFF", "#FFFFFF") - 1) < 0.001);
});

test("thème sombre : le noir est éclairci pour rester visible, le violet aubergine l'est déjà assez", () => {
  const black = displayPrimary("#000000", "dark");
  assert.notEqual(black, "#000000");
  assert.ok(contrastRatio(black, SURFACE_DARK) >= 1.3, black);
  assert.ok(contrastRatio(black, "#FFFFFF") >= 4.5, "le texte blanc doit rester lisible");
  const aubergine = displayPrimary("#4B0082", "dark");
  assert.ok(contrastRatio(aubergine, SURFACE_DARK) >= 1.3, aubergine);
  assert.ok(contrastRatio(aubergine, "#FFFFFF") >= 4.5);
});

test("le bleu nuit classique n'est pas modifié (aucun changement visuel pour l'existant)", () => {
  assert.equal(displayPrimary("#12304A", "dark"), "#12304A");
  assert.equal(displayPrimary("#12304A", "light"), "#12304A");
});

test("thème clair : l'accent utilisé comme texte est assombri jusqu'à être lisible", () => {
  for (const palette of BRAND_PALETTES) {
    const text = displayAccentText(palette.colors.accent, "light");
    assert.ok(contrastRatio(text, SURFACE_LIGHT) >= 3.6, `${palette.id} : ${text}`);
  }
  assert.notEqual(displayAccentText("#FFD600", "light"), "#FFD600");
});

test("thème sombre : un accent clair reste inchangé, la couleur enregistrée n'est jamais modifiée", () => {
  assert.equal(displayAccentText("#FFD600", "dark"), "#FFD600");
  const colors = { primary: "#000000", secondary: "#007BFF", accent: "#FF073A" };
  displayPrimary(colors.primary, "dark");
  assert.deepEqual(colors, { primary: "#000000", secondary: "#007BFF", accent: "#FF073A" });
});

test("résolution : aucune personnalisation = classique ; triplet connu = sa palette ; sinon libre", () => {
  assert.equal(resolvePaletteId(null), "default");
  assert.equal(resolvePaletteId({ primaryColor: null, secondaryColor: null, accentColor: null }), "default");
  assert.equal(resolvePaletteId({ primaryColor: "#4B0082", secondaryColor: "#C0C0C0", accentColor: "#D4AF37" }), "aubergine-dore");
  assert.equal(resolvePaletteId({ primaryColor: "#111111", secondaryColor: "#222222", accentColor: "#333333" }), null);
  assert.deepEqual(resolveBrandColors({ primaryColor: "#111111", secondaryColor: "#222222", accentColor: "#333333" }), {
    primary: "#111111",
    secondary: "#222222",
    accent: "#333333",
  });
});
