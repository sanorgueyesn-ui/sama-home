// Lot 3B (B2.14-A et B2.14-B) — interface des demandes de paiement manuel et de prolongation : CONTENU de
// la section (côté serveur) et PROPRIÉTÉS transmises aux commandes de décision.
//
// Isolation : AUCUNE base, AUCUN réseau, AUCUN navigateur. Les composants de présentation serveur sont des
// fonctions pures : on les appelle directement et on parcourt l'arbre d'éléments React obtenu (texte,
// balises, propriétés) sans rendu DOM. Le composant client des commandes de décision (qui utilise des
// hooks) n'est PAS exécuté ici : il apparaît comme une feuille « decision-controls » dont on vérifie les
// propriétés ; son affichage réel est contrôlé par `subscription-change-decision-render.test.mts` et sa
// logique par `subscription-change-decision-logic.test.mts`. `@/lib/subscription-change-data`, les actions
// serveur et `next/navigation` sont remplacés par des doublures. Ces tests prouvent le contenu et la
// structure rendus ; ils ne remplacent pas un contrôle visuel dans un navigateur.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Overview = import("../subscription-change-data").SubscriptionChangeOverview;
type RequestView = import("../subscription-change-data").SubscriptionChangeRequestView;

let overviewResult: () => Promise<Overview | null> = async () => null;
let overviewCalls = 0;

const stubs: Record<string, unknown> = {
  "@/lib/subscription-change-data": {
    getSubscriptionChangeOverview: async () => {
      overviewCalls++;
      return overviewResult();
    },
  },
  // Le composant client des commandes importe les actions serveur et le routeur : doublures inertes.
  "@/app/actions/subscription-change": {
    approveSubscriptionChange: async () => ({}),
    rejectSubscriptionChange: async () => ({}),
    cancelSubscriptionChange: async () => ({}),
  },
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const view = await import("../../app/plateforme/abonnements/subscription-change-view");
const section = await import("../../app/plateforme/abonnements/subscription-change-section");

// --- Parcours de l'arbre d'éléments React -----------------------------------------------------------

type Tree = string | { tag: string; props: Record<string, unknown>; children: Tree[] };
type ReactLike = { type: unknown; props: Record<string, unknown> & { children?: unknown } };

function toTree(node: unknown): Tree[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(toTree);
  if (typeof node === "object" && "type" in (node as object) && "props" in (node as object)) {
    const element = node as ReactLike;
    if (typeof element.type === "function") {
      // Composant client à hooks : non exécuté ici, représenté par une feuille avec ses propriétés.
      if ((element.type as { name?: string }).name === "SubscriptionChangeDecisionControls") {
        return [{ tag: "decision-controls", props: element.props, children: [] }];
      }
      return toTree((element.type as (props: unknown) => unknown)(element.props));
    }
    if (typeof element.type === "symbol") return toTree(element.props.children);
    return [{ tag: String(element.type), props: element.props, children: toTree(element.props.children) }];
  }
  return [];
}
const flatText = (trees: Tree[]): string =>
  trees.map((t) => (typeof t === "string" ? t : flatText(t.children))).join("");
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const textOf = (node: unknown) => normalize(flatText(toTree(node)));
function walk(trees: Tree[], visit: (tag: string, props: Record<string, unknown>) => void) {
  for (const t of trees) {
    if (typeof t === "string") continue;
    visit(t.tag, t.props);
    walk(t.children, visit);
  }
}
type ControlsProps = {
  requestId: string;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  summary: { kindLabel: string; establishmentName: string; details: string; effect: string };
};
function controlsOf(node: unknown): ControlsProps[] {
  const found: ControlsProps[] = [];
  walk(toTree(node), (tag, props) => {
    if (tag === "decision-controls") found.push(props as unknown as ControlsProps);
  });
  return found;
}
const tagsOf = (node: unknown) => {
  const tags = new Set<string>();
  walk(toTree(node), (tag) => tags.add(tag));
  return tags;
};

// --- Jeu de données ---------------------------------------------------------------------------------

let seq = 0;
function req(o: Partial<RequestView> = {}): RequestView {
  const n = ++seq;
  return {
    id: `req-${n}`,
    kind: "MANUAL_PAYMENT",
    status: "PENDING_SECOND_APPROVAL",
    establishment: { id: "etab-1", name: "Résidence Teranga" },
    amountFcfa: 12_500,
    periodMonths: 6,
    days: null,
    reference: "OM-77",
    reason: "Espèces reçues",
    createdAt: new Date("2026-10-20T09:30:00Z"),
    requesterName: "Aïssatou Admin",
    requesterMissing: false,
    isOwnRequest: false,
    decidedByName: null,
    decidedAt: null,
    decisionReason: null,
    waitingForSecondAdministrator: false,
    canApprove: true,
    canReject: true,
    canCancel: false,
    ...o,
  };
}
const closedReq = (status: "APPROVED" | "REJECTED" | "CANCELLED", o: Partial<RequestView> = {}) =>
  req({
    status,
    decidedAt: new Date("2026-10-22T14:05:00Z"),
    decidedByName: status === "CANCELLED" ? "Aïssatou Admin" : "Boubacar Second",
    decisionReason: status === "REJECTED" ? "Paiement non reçu" : null,
    canApprove: false,
    canReject: false,
    canCancel: false,
    ...o,
  });
const overview = (o: Partial<Overview> = {}): Overview => ({
  pending: [],
  pendingTruncated: false,
  recentClosed: [],
  eligibleAdministratorCount: 2,
  ...o,
});
const ready = (o: Partial<Overview> = {}) => ({ status: "ready" as const, overview: overview(o) });
const render = (state: Parameters<typeof view.SubscriptionChangeRequestsView>[0]["state"]) =>
  view.SubscriptionChangeRequestsView({ state });

// --- Affichage des demandes ----------------------------------------------------------------------

test("demande en attente : établissement, type, montant, durée, date, demandeur, référence, motif et statut visibles", () => {
  const text = textOf(render(ready({ pending: [req()] })));
  for (const expected of [
    "Résidence Teranga",
    "Paiement manuel",
    "12 500 FCFA",
    "6 mois",
    "En attente de seconde validation",
    "Demandée le",
    "octobre 2026",
    "par Aïssatou Admin",
    "Référence : OM-77",
    "Motif : Espèces reçues",
    "1 en attente",
  ]) {
    assert.ok(text.includes(expected), `texte attendu : « ${expected} »`);
  }
});

test("demande de prolongation : durée en jours (singulier et pluriel), sans montant ni mois", () => {
  const pluriel = textOf(render(ready({ pending: [req({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 90, reference: null })] })));
  assert.ok(pluriel.includes("Prolongation"));
  assert.ok(pluriel.includes("90 jours"));
  assert.ok(!pluriel.includes("FCFA") && !pluriel.includes(" mois"), "ni montant ni mois pour une prolongation");
  assert.ok(!pluriel.includes("Référence"), "pas de référence absente");
  const singulier = textOf(render(ready({ pending: [req({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 1, reference: null })] })));
  assert.ok(singulier.includes("1 jour") && !singulier.includes("1 jours"));
});

test("demande faite par l'utilisateur courant : mention « vous » et explication", () => {
  const text = textOf(render(ready({ pending: [req({ isOwnRequest: true })] })));
  assert.ok(text.includes("(vous)"));
  assert.ok(text.includes("Vous avez fait cette demande"));
  assert.ok(text.includes("Vous ne pouvez pas l'approuver vous-même"));
});

test("demandeur absent : explique qu'elle ne peut pas être approuvée et que le rejet exige un motif ; seul le rejet est proposé", () => {
  const tree = render(ready({ pending: [req({ requesterMissing: true, requesterName: null, canApprove: false, canReject: true, canCancel: false })] }));
  const text = textOf(tree);
  assert.ok(text.includes("Demandeur supprimé"));
  assert.ok(text.includes("ne peut pas être approuvée"));
  assert.ok(text.includes("rejetée"));
  assert.ok(text.includes("motif de rejet est obligatoire"));
  assert.ok(!text.includes("(vous)"));
  for (const tag of ["button", "form", "input", "textarea", "select", "a"]) assert.ok(!tagsOf(tree).has(tag), `aucune balise <${tag}> dans la section serveur`);
  const controls = controlsOf(tree);
  assert.equal(controls.length, 1);
  assert.deepEqual([controls[0].canApprove, controls[0].canReject, controls[0].canCancel], [false, true, false], "rejet seul");
});

test("aucun second administrateur autorisé : explication claire, la demande reste en attente", () => {
  const text = textOf(render(ready({ pending: [req({ isOwnRequest: true, waitingForSecondAdministrator: true })] })));
  assert.ok(text.includes("En attente d'un autre administrateur autorisé"));
  assert.ok(text.includes("aucun autre compte disposant de la permission « Abonnements »"));
  assert.ok(text.includes("Elle reste en attente"));
});

test("demande d'un autre administrateur avec un décideur disponible : attente de la décision d'un administrateur autre que le demandeur", () => {
  const text = textOf(render(ready({ pending: [req()] })));
  assert.ok(text.includes("En attente de la décision d'un administrateur autorisé autre que le demandeur"));
});

test("demandes clôturées : statut, décideur, date de décision et motif de la décision", () => {
  const text = textOf(
    render(
      ready({
        recentClosed: [
          closedReq("APPROVED"),
          closedReq("REJECTED"),
          closedReq("CANCELLED"),
          closedReq("CANCELLED", { decidedByName: null, decisionReason: "Demandeur supprimé" }),
        ],
      }),
    ),
  );
  for (const expected of [
    "Approuvée", "Approuvée par Boubacar Second le",
    "Rejetée", "Rejetée par Boubacar Second le", "Motif de la décision : Paiement non reçu",
    "Annulée", "Annulée par Aïssatou Admin le",
    "Annulée automatiquement", "Motif de la décision : Demandeur supprimé",
    "octobre 2026",
    "Demandes clôturées récentes",
    "Les 20 dernières demandes",
  ]) {
    assert.ok(text.includes(expected), `texte attendu : « ${expected} »`);
  }
});

test("20 demandes clôturées affichées telles que fournies par la lecture", () => {
  const closed = Array.from({ length: 20 }, (_, i) => closedReq(i % 2 ? "APPROVED" : "REJECTED", { establishment: { id: `e${i}`, name: `Établissement ${i}` } }));
  const text = textOf(render(ready({ recentClosed: closed })));
  assert.equal((text.match(/Demandée le/g) ?? []).length, 20);
  assert.ok(text.includes("Établissement 0") && text.includes("Établissement 19"));
});

// --- Cas particuliers : troncature, vide, chargement, erreur, refus ----------------------------------

test("liste tronquée : avertissement et compteur « 200+ »", () => {
  const pending = Array.from({ length: 200 }, (_, i) => req({ establishment: { id: `e${i}`, name: `Hôtel ${i}` } }));
  const tree = render(ready({ pending, pendingTruncated: true }));
  const text = textOf(tree);
  assert.ok(text.includes("200+ en attente"));
  assert.ok(text.includes("Il y a plus de 200 demandes en attente"));
  assert.ok(text.includes("limitée aux 200 plus anciennes"));
  assert.equal((text.match(/Demandée le/g) ?? []).length, 200);
  const notTruncated = textOf(render(ready({ pending: [req()] })));
  assert.ok(!notTruncated.includes("limitée aux"));
});

test("listes vides : messages explicites pour les demandes en attente et les demandes clôturées", () => {
  const text = textOf(render(ready()));
  assert.ok(text.includes("Aucune demande en attente"));
  assert.ok(text.includes("0 en attente"));
  assert.ok(text.includes("Aucune demande clôturée pour le moment"));
});

test("chargement : indicateur accessible, aucune donnée affichée", () => {
  const tree = view.SubscriptionChangeRequestsLoading();
  const text = textOf(tree);
  assert.ok(text.includes("Chargement des demandes en cours"));
  let status = false;
  walk(toTree(tree), (_tag, props) => {
    if (props.role === "status") status = true;
  });
  assert.ok(status, "role=status présent");
  assert.ok(!text.includes("Résidence"));
});

test("erreur de lecture : message d'erreur (role=alert), aucune donnée présentée comme chargée, aucun détail technique", () => {
  const tree = render({ status: "error" });
  const text = textOf(tree);
  assert.ok(text.includes("Impossible de charger les demandes"));
  assert.ok(text.includes("Rechargez la page"));
  assert.ok(!text.includes("Aucune demande en attente"), "ne prétend pas qu'il n'y a aucune demande");
  assert.ok(!text.includes("0 en attente"));
  assert.ok(!text.includes("Aucune demande clôturée"));
  let alert = false;
  walk(toTree(tree), (_tag, props) => {
    if (props.role === "alert") alert = true;
  });
  assert.ok(alert, "role=alert présent");
});

test("permission explicite absente : message neutre, aucune donnée", () => {
  const text = textOf(render({ status: "forbidden" }));
  assert.ok(text.includes("réservée aux administrateurs de plateforme disposant explicitement de la permission « Abonnements »"));
  assert.ok(!text.includes("Aucune demande en attente") && !text.includes("Résidence"));
});

// --- Aucune action de décision ni de paiement --------------------------------------------------------

test("commandes de décision : présentes uniquement sur les demandes en attente qui ont au moins un indicateur d'action", () => {
  const full = req({ canApprove: true, canReject: true, canCancel: true });
  const rejectOnly = req({ requesterMissing: true, requesterName: null, canApprove: false, canReject: true, canCancel: false });
  const cancelOnly = req({ isOwnRequest: true, waitingForSecondAdministrator: true, canApprove: false, canReject: false, canCancel: true });
  const none = req({ canApprove: false, canReject: false, canCancel: false });
  const tree = render(
    ready({
      pending: [full, rejectOnly, cancelOnly, none],
      recentClosed: [closedReq("APPROVED"), closedReq("REJECTED"), closedReq("CANCELLED")],
    }),
  );
  const controls = controlsOf(tree);
  assert.deepEqual(
    controls.map((c) => [c.requestId, c.canApprove, c.canReject, c.canCancel]),
    [
      [full.id, true, true, true],
      [rejectOnly.id, false, true, false],
      [cancelOnly.id, false, false, true],
    ],
    "une commande par demande en attente avec un indicateur ; aucune pour la demande sans indicateur ni pour les clôturées",
  );
  assert.ok(!controls.some((c) => c.requestId === none.id));
});

test("aucune commande ni élément interactif dans les états vide, erreur, refus et chargement, ni sur les demandes clôturées", () => {
  const trees = [
    render(ready()),
    render(ready({ recentClosed: [closedReq("APPROVED"), closedReq("REJECTED"), closedReq("CANCELLED")] })),
    render({ status: "error" }),
    render({ status: "forbidden" }),
    view.SubscriptionChangeRequestsLoading(),
  ];
  for (const tree of trees) {
    assert.equal(controlsOf(tree).length, 0);
    const tags = tagsOf(tree);
    for (const tag of ["button", "form", "input", "textarea", "select", "a"]) assert.ok(!tags.has(tag), `aucune balise <${tag}>`);
    walk(toTree(tree), (_tag, props) => {
      for (const prop of Object.keys(props)) {
        assert.ok(!/^on[A-Z]/.test(prop), `aucune propriété ${prop}`);
        assert.notEqual(prop, "href");
        assert.notEqual(prop, "action");
        assert.notEqual(prop, "dangerouslySetInnerHTML");
      }
    });
  }
});

test("propriétés transmises au composant client : texte et booléens seulement, aucune donnée sensible", () => {
  const polluted = Object.assign(req({ canApprove: true, canReject: true, canCancel: false }), {
    passwordHash: "SECRET_HASH_XYZ",
    email: "secret@exemple.invalid",
    idempotencyKey: "cle_secrete_123",
    requestedByUserId: "admin-secret-id",
  });
  const [controls] = controlsOf(render(ready({ pending: [polluted] })));
  assert.deepEqual(Object.keys(controls).sort(), ["canApprove", "canCancel", "canReject", "requestId", "summary"]);
  assert.deepEqual(Object.keys(controls.summary).sort(), ["details", "effect", "establishmentName", "kindLabel"]);
  assert.ok(Object.values(controls.summary).every((v) => typeof v === "string"));
  assert.ok([controls.canApprove, controls.canReject, controls.canCancel].every((v) => typeof v === "boolean"));
  const serialized = JSON.stringify(controls);
  for (const secret of ["SECRET_HASH_XYZ", "secret@exemple.invalid", "cle_secrete_123", "admin-secret-id"]) {
    assert.ok(!serialized.includes(secret), `ne doit pas transmettre « ${secret} »`);
  }
});

test("texte de confirmation : type, établissement, montant ou durée et effet de l'approbation", () => {
  const [mp] = controlsOf(render(ready({ pending: [req({ amountFcfa: 12_500, periodMonths: 6 })] })));
  assert.equal(mp.summary.kindLabel, "Paiement manuel");
  assert.equal(mp.summary.establishmentName, "Résidence Teranga");
  assert.equal(normalize(mp.summary.details), "12 500 FCFA · 6 mois");
  assert.equal(normalize(mp.summary.effect), "Un règlement confirmé de 12 500 FCFA sera enregistré et l'abonnement sera prolongé de 6 mois.");
  const [pr] = controlsOf(render(ready({ pending: [req({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 30, reference: null })] })));
  assert.equal(pr.summary.kindLabel, "Prolongation");
  assert.equal(pr.summary.details, "30 jours");
  assert.equal(pr.summary.effect, "L'abonnement sera prolongé de 30 jours.");
  const [one] = controlsOf(render(ready({ pending: [req({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 1, reference: null })] })));
  assert.equal(one.summary.effect, "L'abonnement sera prolongé de 1 jour.");
});

test("les indicateurs d'action ne modifient pas le texte de la section : ils pilotent seulement les commandes", () => {
  const withFlags = textOf(render(ready({ pending: [req({ canApprove: true, canReject: true, canCancel: true })] })));
  const withoutFlags = textOf(render(ready({ pending: [req({ canApprove: false, canReject: false, canCancel: false })] })));
  assert.equal(withFlags, withoutFlags);
});

test("aucune fuite : les champs sensibles absents du type ne sont jamais affichés même s'ils étaient présents", () => {
  const polluted = req() as RequestView & Record<string, unknown>;
  Object.assign(polluted, {
    passwordHash: "SECRET_HASH_XYZ",
    email: "secret@exemple.invalid",
    username: "login-secret",
    idempotencyKey: "cle_secrete_123",
    requestedByUserId: "admin-secret-id",
    permissions: '["PLATFORM_ALL"]',
  });
  const text = textOf(render(ready({ pending: [polluted], recentClosed: [Object.assign(closedReq("APPROVED"), { passwordHash: "SECRET_HASH_XYZ" })] })));
  for (const secret of ["SECRET_HASH_XYZ", "secret@exemple.invalid", "login-secret", "cle_secrete_123", "admin-secret-id", "PLATFORM_ALL", polluted.id]) {
    assert.ok(!text.includes(secret), `ne doit pas afficher « ${secret} »`);
  }
});

test("textes libres rendus comme du texte : balises et scripts affichés tels quels, jamais interprétés", () => {
  const tree = render(ready({ pending: [req({ reference: "<script>alert(1)</script>", reason: "<img src=x onerror=alert(1)>" })] }));
  const tags = tagsOf(tree);
  assert.ok(!tags.has("script") && !tags.has("img"));
  const text = textOf(tree);
  assert.ok(text.includes("<script>alert(1)</script>") && text.includes("<img src=x onerror=alert(1)>"));
});

// --- Composant serveur de lecture --------------------------------------------------------------------

type SectionElement = { type: unknown; props: { state: { status: string; overview?: Overview } } };
const runSection = async () => (await section.SubscriptionChangeRequestsSection()) as unknown as SectionElement;

test("composant serveur : lecture autorisée → état « ready » transmis au composant de présentation", async () => {
  overviewCalls = 0;
  const data = overview({ pending: [req()] });
  overviewResult = async () => data;
  const element = await runSection();
  assert.equal(element.type, view.SubscriptionChangeRequestsView);
  assert.equal(element.props.state.status, "ready");
  assert.equal(element.props.state.overview, data);
  assert.equal(overviewCalls, 1);
});

test("composant serveur : permission explicite absente (null) → état « forbidden », sans donnée", async () => {
  overviewResult = async () => null;
  const element = await runSection();
  assert.deepEqual(element.props.state, { status: "forbidden" });
});

test("composant serveur : échec de lecture → état « error », erreur journalisée côté serveur sans fuite dans l'affichage", async () => {
  overviewResult = async () => {
    throw new Error("connexion refusée postgres://utilisateur:motdepasse@hote/base");
  };
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  const element = await runSection().finally(() => {
    console.error = original;
  });
  assert.deepEqual(element.props.state, { status: "error" });
  assert.equal(logged.length, 1, "l'erreur est journalisée une fois");
  assert.ok(!textOf(render(element.props.state as never)).includes("motdepasse"), "aucun détail technique affiché");
});

test("composant serveur : les erreurs internes de Next.js (redirection…) sont relancées, jamais masquées", async () => {
  for (const digest of ["NEXT_REDIRECT;replace;/dashboard;307;", "NEXT_NOT_FOUND", "DYNAMIC_SERVER_USAGE"]) {
    overviewResult = async () => {
      throw Object.assign(new Error("interne"), { digest });
    };
    await assert.rejects(runSection(), (error: unknown) => (error as { digest?: string }).digest === digest, digest);
  }
  // Une erreur ordinaire portant un autre « digest » reste traitée comme un échec de lecture.
  overviewResult = async () => {
    throw Object.assign(new Error("autre"), { digest: "123456" });
  };
  const original = console.error;
  console.error = () => undefined;
  try {
    assert.deepEqual((await runSection()).props.state, { status: "error" });
  } finally {
    console.error = original;
  }
});

// --- Garde de régression sur le code source -----------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("source : composants de présentation et de lecture, sans action serveur, sans accès direct à la base", () => {
  for (const rel of ["app/plateforme/abonnements/subscription-change-view.tsx", "app/plateforme/abonnements/subscription-change-section.tsx"]) {
    const source = read(rel);
    const code = strip(source);
    assert.doesNotMatch(source, /^\s*["']use (client|server)["']/m, `${rel} : ni "use client" ni "use server"`);
    assert.doesNotMatch(code, /@\/app\/actions|from "\.\.\/\.\.\/actions/, `${rel} : aucune action importée directement`);
    assert.doesNotMatch(code, /@\/lib\/prisma|\bprisma\b/, `${rel} : aucune requête directe`);
    assert.doesNotMatch(code, /<(button|form|input|textarea|select|a)\b/i, `${rel} : aucun élément interactif`);
    assert.doesNotMatch(code, /\bon[A-Z]\w*=|dangerouslySetInnerHTML|useState|useTransition|useRouter/, `${rel} : aucun gestionnaire ni état client`);
    assert.doesNotMatch(code, /:\s*any\b|\bas any\b|<any>/);
    assert.doesNotMatch(code, /passwordHash|email|username|idempotencyKey|requestedByUserId/, `${rel} : aucune donnée sensible référencée`);
  }
  assert.match(strip(read("app/plateforme/abonnements/subscription-change-section.tsx")), /getSubscriptionChangeOverview\(\)/);
  assert.doesNotMatch(strip(read("app/plateforme/abonnements/subscription-change-section.tsx")), /canApprove|canReject|canCancel/, "la lecture serveur ne manipule pas les indicateurs");
  // La vue ne fait que transmettre les indicateurs au composant client, sans jamais appeler d'action.
  const viewCode = strip(read("app/plateforme/abonnements/subscription-change-view.tsx"));
  assert.match(viewCode, /<SubscriptionChangeDecisionControls/);
  assert.match(viewCode, /request\.canApprove \|\| request\.canReject \|\| request\.canCancel/);
});

test("source : la page garde sa protection d'accès, ses sections historiques et intègre la section dans un <Suspense>", () => {
  const page = read("app/plateforme/abonnements/page.tsx");
  assert.match(page, /await requirePlatformPermission\("PLATFORM_SUBSCRIPTIONS"\)/);
  assert.match(page, /<Suspense fallback=\{<SubscriptionChangeRequestsLoading \/>\}>\s*<SubscriptionChangeRequestsSection \/>\s*<\/Suspense>/);
  for (const heading of ["Demandes de renouvellement reçues", "Suivi de tous les établissements", "Historique des règlements d&apos;abonnement"]) {
    assert.ok(page.includes(heading), `section historique conservée : ${heading}`);
  }
  assert.match(page, /<ConfirmPaymentButton /);
  assert.match(page, /<SubscriptionsTable/);
  assert.doesNotMatch(page, /actions\/subscription-change/, "la page n'importe aucune nouvelle action");
});
