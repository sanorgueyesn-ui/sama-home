// Organisation des paramètres : le menu ne montre que ce que le rôle peut ouvrir, chaque entrée
// mène à une vraie page, et surtout les protections serveur réservées à l'administrateur sont
// restées en place sur chaque page (le masquage du menu ne protège rien à lui seul).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isNavItemActive, SETTINGS_NAV, visibleGroups } from "../../app/settings/settings-nav-config";

const hrefs = (isAdmin: boolean) => visibleGroups(isAdmin).flatMap((group) => group.items.map((item) => item.href));

test("administrateur : toutes les sections sont visibles", () => {
  const all = SETTINGS_NAV.flatMap((group) => group.items.map((item) => item.href));
  assert.deepEqual(hrefs(true), all);
});

test("gestionnaire : aucune section réservée à l'administrateur n'apparaît", () => {
  const visible = hrefs(false);
  for (const adminHref of ["/settings/users", "/settings/bank-accounts", "/settings/transfer-schedules", "/settings/expense-categories"]) {
    assert.ok(!visible.includes(adminHref), `${adminHref} ne doit pas être proposé à un gestionnaire`);
  }
  for (const common of ["/settings", "/settings/etablissement", "/settings/apparence", "/settings/password", "/settings/a-propos"]) {
    assert.ok(visible.includes(common), `${common} doit rester accessible`);
  }
});

test("un groupe vide est retiré du menu", () => {
  const titles = visibleGroups(false).map((group) => group.title);
  assert.ok(!titles.includes("Équipe") && !titles.includes("Finances") && !titles.includes("Activité"));
  assert.ok(titles.includes("Général") && titles.includes("Mon compte") && titles.includes("Informations"));
});

test("entrée active : « Vue d'ensemble » exactement, les autres sur leurs pages enfants", () => {
  assert.equal(isNavItemActive("/settings", "/settings"), true);
  assert.equal(isNavItemActive("/settings/users", "/settings"), false);
  assert.equal(isNavItemActive("/settings/users", "/settings/users"), true);
  assert.equal(isNavItemActive("/settings/users/new", "/settings/users"), true);
  assert.equal(isNavItemActive("/settings/users/abc/edit", "/settings/users"), true);
  assert.equal(isNavItemActive("/settings/usersx", "/settings/users"), false);
});

test("chaque entrée du menu pointe vers une page qui existe", () => {
  for (const group of SETTINGS_NAV) {
    for (const item of group.items) {
      const dir = item.href === "/settings" ? "src/app/settings" : `src/app${item.href}`;
      assert.ok(existsSync(`${dir}/page.tsx`), `page manquante pour ${item.href}`);
    }
  }
});

test("garde de source : les pages réservées à l'administrateur appellent toujours requireAdmin()", () => {
  for (const file of [
    "src/app/settings/users/page.tsx",
    "src/app/settings/users/new/page.tsx",
    "src/app/settings/users/[id]/edit/page.tsx",
    "src/app/settings/users/[id]/reset-password/page.tsx",
    "src/app/settings/bank-accounts/page.tsx",
    "src/app/settings/bank-accounts/new/page.tsx",
    "src/app/settings/expense-categories/page.tsx",
    "src/app/settings/expense-categories/new/page.tsx",
    "src/app/settings/transfer-schedules/page.tsx",
    "src/app/settings/transfer-schedules/new/page.tsx",
  ]) {
    assert.match(readFileSync(file, "utf8"), /await requireAdmin\(\)/, `${file} a perdu sa garde administrateur`);
  }
});

test("garde de source : le menu ne remplace pas la protection, la session est imposée par le cadre", () => {
  const layout = readFileSync("src/app/settings/layout.tsx", "utf8");
  assert.match(layout, /getCurrentUser\(\)/);
  const config = readFileSync("src/app/settings/settings-nav-config.ts", "utf8");
  assert.match(config, /requireAdmin\(\)/, "le commentaire doit rappeler que requireAdmin() reste la vraie protection");
});

test("les redirections après enregistrement mènent aux nouvelles pages", () => {
  const actions = readFileSync("src/app/actions/settings.ts", "utf8");
  assert.match(actions, /redirect\("\/settings\/etablissement\?saved=1"\)/);
  assert.match(actions, /redirect\("\/settings\/password\?passwordChanged=1"\)/);
  assert.ok(!/redirect\("\/settings\?saved=1"\)/.test(actions));
});
