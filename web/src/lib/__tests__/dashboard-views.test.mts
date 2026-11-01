// Tableaux de bord Résidence / Hôtel / Agence : rendu serveur avec un jeu de données fixe.
// On vérifie que les chiffres affichés sont ceux de la lecture réelle, qu'aucun reste de maquette
// ne subsiste, et que ce qui n'existe pas encore est annoncé sans chiffre. Le rendu se fait dans un
// processus enfant (helpers/render-dashboard-markup.mts) : `react-dom/server` est indisponible sous
// la condition `react-server` des tests. Aucune base, aucun navigateur.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const helper = fileURLToPath(new URL("./helpers/render-dashboard-markup.mts", import.meta.url));
const raw = execFileSync(process.execPath, ["--import", "tsx", helper], {
  encoding: "utf8",
  cwd: fileURLToPath(new URL("../../../", import.meta.url)),
  env: { ...process.env, NODE_OPTIONS: "" },
});
const html = JSON.parse(raw) as Record<string, string>;

const text = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

test("Résidence : chiffres réels, prénom de la session, actions rapides valides", () => {
  const page = html.residence;
  const plain = text(page);
  assert.match(plain, /Bonjour, Fatou/);
  assert.match(plain, /Résidence Almadies/);
  assert.match(plain, /272 000/); // recettes du jour
  assert.match(plain, /16 000/); // soldes à recouvrer
  assert.match(plain, /1 réservation|3 réservation/); // à venir
  for (const href of ["/locations/new", "/reservations/new", "/caisse", "/depenses"]) {
    assert.ok(page.includes(`href="${href}"`), `lien manquant : ${href}`);
  }
});

test("aucun reste de maquette dans les trois tableaux de bord", () => {
  for (const plain of [html.residence, html.hotel, html.agency].map(text)) {
    for (const fake of ["Moussa", "Le Saphir", "Agence Atlantique", "3 450 000", "20 mai", "2025", "12 chambres"]) {
      assert.ok(!plain.includes(fake), `reste de maquette trouvé : ${fake}`);
    }
  }
});

test("Hôtel : taux d'occupation, rack des chambres, aucun nom de client dans les dernières occupations", () => {
  const page = html.hotel;
  const plain = text(page);
  assert.match(plain, /Taux d'occupation/);
  assert.match(plain, /67 %/); // 2 occupés sur 3 exploitables
  assert.ok(page.includes('href="/logements/r1"'));
  const start = plain.indexOf("5 dernières chambres occupées");
  const end = plain.indexOf("Argent encaissé");
  assert.ok(start >= 0);
  const recent = plain.slice(start, plain.indexOf("5 derniers appartements occupés"));
  assert.ok(!recent.includes("Awa Diop"), "le nom du client ne doit pas figurer dans les dernières occupations");
  assert.ok(end >= 0);
  // Ménage et entretien : modules inexistants, jamais d'alerte décorative.
  assert.ok(!/ménage|entretien/i.test(plain));
});

test("Agence : vocabulaire biens/loyers, modules à venir annoncés sans aucun chiffre", () => {
  const page = html.agency;
  const plain = text(page);
  assert.match(plain, /Biens enregistrés/);
  assert.match(plain, /Loyers encaissés/);
  assert.match(plain, /Impayés/);
  const soon = plain.slice(plain.indexOf("Prochains modules de l'agence"));
  assert.equal((soon.match(/Bientôt disponible/g) ?? []).length, 3);
  assert.ok(!/\d/.test(soon.replace(/aucun chiffre/g, "")), "les modules à venir ne doivent afficher aucun chiffre");
});

test("espace vide : états vides explicites, jamais de chiffre inventé", () => {
  for (const markup of [html.residenceEmpty, html.hotelEmpty, html.agencyEmpty]) {
    assert.match(text(markup), /Aucun/);
    assert.ok(!markup.includes("NaN") && !markup.includes("undefined"));
  }
});

test("garde de source : les vues et la page n'ont aucune donnée fictive codée en dur", () => {
  for (const file of [
    "src/components/dashboard/dashboard-residence-view.tsx",
    "src/components/dashboard/dashboard-hotel-view.tsx",
    "src/components/dashboard/dashboard-agency-view.tsx",
    "src/app/dashboard/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    for (const fake of ["Moussa", "Le Saphir", "3 450 000", "/maquette-mnd/"]) {
      assert.ok(!source.includes(fake), `${file} contient « ${fake} »`);
    }
  }
});

test("garde de source : la lecture est filtrée par l'espace de la session, jamais par le client", () => {
  const source = readFileSync("src/lib/dashboard-overview.ts", "utf8");
  assert.match(source, /getCurrentUser\(\)/);
  assert.match(source, /user\.establishmentId/);
  assert.ok(!/searchParams|formData|headers\(\)/.test(source));
  for (const model of ["property", "rental", "payment", "client", "reservation"]) {
    const call = new RegExp(`prisma\\.${model}\\.(findMany|aggregate|count)\\([^)]*establishmentId`, "s");
    assert.match(source, call, `${model} doit être filtré par establishmentId`);
  }
});

test("garde de source : ?mode= n'est honoré qu'en développement", () => {
  const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
  assert.match(page, /NODE_ENV === "development"/);
  const shell = readFileSync("src/components/navigation/app-shell.tsx", "utf8");
  assert.match(shell, /NODE_ENV === "development"/);
});
