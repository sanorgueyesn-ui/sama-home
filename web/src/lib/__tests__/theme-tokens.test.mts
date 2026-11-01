// Thème clair / sombre : le cadre de l'application (menu, en-tête, barre du bas) et les tableaux de
// bord doivent changer de thème AVEC le reste de l'écran. Garde de source : plus aucune couleur de
// cadre écrite en dur dans ces fichiers, et chaque variable de palette est définie pour les DEUX thèmes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const FRAME_FILES = [
  "src/components/navigation/app-shell.tsx",
  "src/components/navigation/space-switcher.tsx",
  "src/components/dashboard/dashboard-ui.tsx",
  "src/components/dashboard/dashboard-lists.tsx",
  "src/components/dashboard/dashboard-residence-view.tsx",
  "src/components/dashboard/dashboard-hotel-view.tsx",
  "src/components/dashboard/dashboard-agency-view.tsx",
  "src/app/dashboard/page.tsx",
];

// Couleurs de cadre sombres qui ne doivent plus apparaître en dur (les couleurs de marque et de
// statut, comme #e11d48 ou #2563eb, restent identiques dans les deux thèmes et sont permises).
const FORBIDDEN_HEX = ["0a0f16", "0b111a", "111923", "0f1620", "0f1722", "17212f", "1b2736", "1f2c3f", "1b2838", "26374d", "2a3c54", "2d3f57", "35496a", "162130", "1a2332", "94a3b8", "9aa8bb", "7d8ba0", "cbd5e1", "e2e8f0", "64748b", "475569"];

test("cadre et tableaux de bord : aucune couleur sombre fixe", () => {
  for (const file of FRAME_FILES) {
    const source = readFileSync(file, "utf8");
    for (const hex of FORBIDDEN_HEX) {
      assert.ok(!new RegExp(`\\[#${hex}\\]`, "i").test(source), `${file} contient #${hex} en dur : utiliser une variable de thème (bg-app-*, text-app-*)`);
    }
    assert.ok(!/bg-white\//.test(source), `${file} : bg-white/* est invisible en thème clair, utiliser bg-fg/*`);
  }
});

test("le texte blanc n'existe plus que sur des fonds de couleur de marque", () => {
  for (const file of FRAME_FILES) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!/(?<![\w-])text-white(?![\w-])/.test(line)) return;
      const onBrandColor = /bg-\[#(e11d48|2563eb|7c3aed|0284c7|1e60f0)\]|iconBgClassName|primary:/.test(line);
      assert.ok(onBrandColor, `${file}:${index + 1} : text-white hors fond de marque (invisible en thème clair)`);
    });
  }
});

test("chaque variable de palette est définie en clair ET en sombre, et déclarée au thème Tailwind", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const light = css.slice(css.indexOf(":root {\n  --app-sidebar"), css.indexOf(':root[data-theme="dark"] {\n  --app-sidebar'));
  const dark = css.slice(css.indexOf(':root[data-theme="dark"] {\n  --app-sidebar'));
  const names = [...light.matchAll(/--(app-[a-z0-9-]+):/g)].map((m) => m[1]);
  assert.ok(names.length >= 20, "palette incomplète");
  for (const name of names) {
    assert.ok(dark.includes(`--${name}:`), `--${name} manque en thème sombre`);
    assert.ok(css.includes(`--color-${name}: var(--${name})`), `--color-${name} n'est pas déclaré au thème Tailwind`);
  }
});

test("le logo change avec le thème : version d'origine en clair, inversée en sombre", () => {
  const shell = readFileSync("src/components/navigation/app-shell.tsx", "utf8");
  assert.match(shell, /sama-home-lockup\.png"[^>]*\[\[data-theme=dark\]_&\]:hidden/);
  assert.match(shell, /sama-home-lockup-light\.png"[^>]*hidden[^>]*\[\[data-theme=dark\]_&\]:block/);
});

test("palette de marque : la mise en page applique les couleurs adaptées au thème, le CSS lit la couleur de texte lisible", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /"--color-navy": displayPrimary\(brandColors\.primary, theme\)/);
  assert.match(layout, /"--color-accent-text": displayAccentText\(brandColors\.accent, theme\)/);
  // Le fond des boutons d'accent garde la vraie couleur enregistrée.
  assert.match(layout, /"--color-brand-orange": brandColors\.accent/);
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.text-brand-orange \{\s*color: var\(--color-accent-text\);/);
});

test("éditeur d'apparence : réservé à l'administrateur côté page, enregistrement par l'action sécurisée existante", () => {
  const page = readFileSync("src/app/settings/apparence/page.tsx", "utf8");
  assert.match(page, /user\.role === "ADMIN"/);
  const editor = readFileSync("src/app/settings/appearance-editor.tsx", "utf8");
  assert.match(editor, /saveBrandColors\(/);
  assert.ok(!/dangerouslySetInnerHTML/.test(editor));
  const action = readFileSync("src/app/actions/brand-colors.ts", "utf8");
  assert.match(action, /user\.role !== "ADMIN"/, "la vraie protection reste côté serveur");
});
