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
      // Fonds de marque : la couleur principale (`bg-navy`, texte blanc vérifié dans l'éditeur) ou les
      // classes d'action des modes (`primary:`, `iconBgClassName`).
      const onBrandColor = /bg-navy|iconBgClassName|primary:/.test(line);
      assert.ok(onBrandColor, `${file}:${index + 1} : text-white hors fond de marque (invisible en thème clair)`);
    });
  }
});

test("chaque variable de palette est définie en clair ET en sombre, et déclarée au thème Tailwind", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const lightStart = css.indexOf(":root {\n  /* SOURCE UNIQUE");
  const darkStart = css.indexOf(':root[data-theme="dark"] {\n  /* Même source');
  assert.ok(lightStart > 0 && darkStart > lightStart, "blocs de palette introuvables");
  const light = css.slice(lightStart, darkStart);
  const dark = css.slice(darkStart);
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

// ---------------------------------------------------------------------------------------------
// Synchronisation des couleurs : UNE source (les variables de page), la palette de marque qui pilote
// l'accent partout, et plus aucune couleur écrite en dur dans les écrans de l'application.
// ---------------------------------------------------------------------------------------------

/** Écrans et composants de l'application d'un établissement (hors pages publiques et console plateforme). */
const APP_SCREEN_FILES = [
  ...FRAME_FILES,
  "src/app/caisse/page.tsx",
  "src/app/caisse/cash-activity-list.tsx",
  "src/app/reservations/reservation-form.tsx",
  "src/app/locations/rental-form.tsx",
  "src/app/locations/[id]/page.tsx",
  "src/components/dashboard/stay-countdown.tsx",
  "src/components/dashboard/occupancy-donut.tsx",
  "src/app/logements/property-form.tsx",
  "src/app/logements/[id]/page.tsx",
  "src/app/logements/[id]/delete-property-button.tsx",
  "src/app/logements/page.tsx",
  "src/app/settings/users/page.tsx",
  "src/app/settings/settings-form.tsx",
  "src/app/espaces/nouveau/add-space-form.tsx",
  "src/app/clients/client-form.tsx",
];

test("cadre et tableaux de bord : aucune couleur hexadécimale écrite en dur (tout suit la palette ou le thème)", () => {
  for (const file of FRAME_FILES) {
    const source = readFileSync(file, "utf8");
    const hex = source.match(/\[#[0-9a-fA-F]{3,8}\]|(?:stroke|fill)="#[0-9a-fA-F]{3,8}"/g);
    assert.equal(hex, null, `${file} contient une couleur fixe (${hex?.join(", ")}) : utiliser bg-brand-orange, bg-navy, bg-success… ou un jeton app-*`);
  }
});

test("écrans de l'application : plus de couleur d'état fixe (emerald, rose, amber, sky…), seulement les jetons réglés pour les deux thèmes", () => {
  const FIXED = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border|ring|outline|from|to|via|fill|stroke|divide)-(?:emerald|green|teal|rose|red|amber|orange|yellow|sky|blue|cyan)-\d{2,3}(?![\w-])/g;
  for (const file of APP_SCREEN_FILES) {
    const found = readFileSync(file, "utf8").match(FIXED);
    assert.equal(found, null, `${file} : ${found?.slice(0, 3).join(", ")} → text-app-good/bad/warn/sky ou bg-success/danger/warning/info`);
  }
});

test("le cadre et les pages partagent UNE source : les jetons app-* dérivent des variables de page", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const light = css.slice(css.indexOf(":root {\n  /* SOURCE UNIQUE"), css.indexOf(':root[data-theme="dark"] {\n  /* Même source'));
  const dark = css.slice(css.indexOf(':root[data-theme="dark"] {\n  /* Même source'), css.indexOf("@theme inline", css.indexOf(':root[data-theme="dark"] {\n  /* Même source')));
  for (const [theme, block] of [["clair", light], ["sombre", dark]] as const) {
    for (const name of ["app-sidebar", "app-page", "app-panel", "app-text", "app-muted", "app-line", "app-hover", "app-focus"]) {
      const line = block.match(new RegExp(`--${name}: ([^;]+);`));
      assert.ok(line, `--${name} manque en thème ${theme}`);
      assert.ok(/var\(--color-/.test(line[1]), `--${name} (${theme}) doit dériver d'une variable de page, pas d'une valeur fixe : ${line[1]}`);
    }
  }
  // Le focus suit l'accent choisi dans Apparence.
  assert.match(light, /--app-focus: var\(--color-accent-text\)/);
});

test("bordures : même règle en clair et en sombre, toujours avec une opacité", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.equal([...css.matchAll(/--color-border: var\(--color-fg\);/g)].length, 2, "clair ET sombre");
  for (const file of ["src/app/not-found.tsx", ...APP_SCREEN_FILES, "src/app/settings/settings-ui.tsx", "src/app/settings/settings-nav.tsx"]) {
    const bare = readFileSync(file, "utf8").match(/(?<![\w/-])(?:border|divide|ring|outline)-border(?![/\w-])/g);
    assert.equal(bare, null, `${file} : border-border sans opacité serait de la couleur du texte, plein`);
  }
});

test("menu et tableaux de bord : l'accent vient de la palette de l'établissement, pas d'une teinte fixe par mode", () => {
  const shell = readFileSync("src/components/navigation/app-shell.tsx", "utf8");
  const accent = shell.slice(shell.indexOf("const MODE_ACCENT"), shell.indexOf("const SOON_ROUTES"));
  assert.equal([...accent.matchAll(/bg-brand-orange/g)].length, 3);
  assert.equal([...accent.matchAll(/text-brand-orange/g)].length, 3);
  const ui = readFileSync("src/components/dashboard/dashboard-ui.tsx", "utf8");
  const colors = ui.slice(ui.indexOf("const MODE_COLORS"), ui.indexOf("export const MODE_THEME"));
  assert.match(colors, /primary: "bg-brand-orange text-ink/);
  assert.match(colors, /bar: "bg-brand-orange"/);
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
