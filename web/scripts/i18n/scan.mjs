// Outil de traduction : repère les textes visibles écrits en français dans le code.
//
//   node scripts/i18n/scan.mjs [--area app/caisse] [--json] [--missing en]
//
// Pour chaque fichier .tsx/.ts il liste :
//   - le texte entre balises JSX                                   (jsx)
//   - les attributs visibles (title, aria-label, placeholder…)     (attr)
//   - les propriétés d'objet qui servent d'étiquette (label, …)    (prop)
// et indique si chacun est déjà traduit à l'écran (dans <T>…</T> ou t("…")).
// `--missing en` ne garde que les phrases sans traduction anglaise dans lib/i18n/phrases/en/.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.env.SRC_ROOT ? path.resolve(process.env.SRC_ROOT) : path.resolve(import.meta.dirname, "../../src");
const TEXT_ATTRS = new Set(["title", "aria-label", "placeholder", "alt", "label", "hint", "description", "aria-description", "helperText", "emptyText", "subtitle", "sub", "caption", "heading", "text", "cta", "tooltip", "legend", "unit", "noun"]);
const TEXT_PROPS = new Set(["label", "title", "description", "message", "error", "hint", "placeholder", "text", "subtitle", "shortLabel", "emptyText", "cta", "heading", "sub", "caption", "tooltip", "legend", "noun", "reason", "note"]);
const SKIP_DIRS = new Set(["generated", "__tests__", "i18n"]);
const ZOD_METHODS = new Set(["min", "max", "length", "regex", "email", "int", "positive", "nonnegative", "refine", "superRefine", "url", "startsWith", "endsWith", "includes", "gte", "lte", "gt", "lt"]);
// Hors périmètre de la traduction de l'interface (voir apply.mjs).
const EXCLUDED = [/^lib\/documents\//, /^lib\/contract-pdf\.tsx$/, /^lib\/whatsapp\.ts$/, /^lib\/guest-info\.ts$/, /^app\/plateforme\//, /^components\/platform\//];

const ENTITIES = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " ", "&#39;": "'", "&lt;": "<", "&gt;": ">", "&rsquo;": "’", "&lsquo;": "‘", "&laquo;": "«", "&raquo;": "»", "&hellip;": "…", "&middot;": "·", "&mdash;": "—", "&ndash;": "–", "&eacute;": "é", "&egrave;": "è", "&agrave;": "à" };
export const decode = (s) => s.replace(/&[#\w]+;/g, (m) => ENTITIES[m] ?? m);
export const key = (s) => decode(s).replace(/\s+/g, " ").trim();

/** Un texte « humain » : au moins une lettre, pas un nom de classe CSS, pas un chemin, pas un identifiant. */
export function isHuman(text) {
  const k = key(text);
  if (k.length < 2 || !/\p{L}/u.test(k)) return false;
  if (/^[\w./:#@?=&%\-[\]()]+$/.test(k) && !/\s/.test(k) && !/[À-ÿ]/.test(k)) return /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(k) && k.length > 3;
  if (/^(https?:|\/|\.\/|@\/)/.test(k)) return false;
  return true;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(path.join(dir, entry.name));
  }
  return out;
}

export function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const items = [];
  const isClient = /^\s*["']use client["']/.test(text);
  const add = (kind, raw, node, covered) => {
    if (!isHuman(raw)) return;
    items.push({ kind, text: key(raw), covered, pos: node.getStart(sf), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
  };
  const inT = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxElement(p) && p.openingElement.tagName.getText(sf) === "T") return true;
    }
    return false;
  };
  const isTCall = (node) => ts.isCallExpression(node) && ["t", "tr"].includes(node.expression.getText(sf));
  const visit = (node) => {
    if (ts.isJsxText(node)) add("jsx", node.getText(sf), node, inT(node));
    else if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && node.initializer && ts.isStringLiteral(node.initializer)) add("attr", node.initializer.text, node, false);
    else if (isTCall(node) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) add("t", node.arguments[0].text, node, true);
    else if (ts.isPropertyAssignment(node) && TEXT_PROPS.has(node.name.getText(sf).replace(/["']/g, "")) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      const covered = false;
      add("prop", node.initializer.text, node, covered);
    }
    // Tables de libellés : const METHOD_LABELS = { CASH: "Espèces", … } (valeur affichée par {METHOD_LABELS[x]})
    if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) && ts.isObjectLiteralExpression(node.parent)) {
      const decl = node.parent.parent;
      if (decl && ts.isVariableDeclaration(decl) && /LABEL|META|WORD|NAMES?|TITLES?|TEXTS?/i.test(decl.name.getText(sf))) add("map", node.initializer.text, node.initializer, false);
    }
    // Messages de validation (zod) : .min(1, "…"), .email("…"), .regex(/…/, "…"), .refine(fn, "…")…
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ZOD_METHODS.has(node.expression.name.text)) {
      for (const arg of node.arguments) if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) add("zod", arg.text, arg, false);
    }
    // Phrases construites avec ${…} : à reprendre à la main (t("… {n} …", { n })), jamais traduisibles telles quelles.
    if (ts.isTemplateExpression(node)) {
      const stat = [node.head.text, ...node.templateSpans.map((x) => x.literal.text)].join(" ");
      if (/[À-ÿ]|(le|la|les|des|du|un|une|aucun|aucune|pour|sur|dans|avec|est|pas|ce|cette|à|au|ou|et)/i.test(stat) && /\p{L}{3,}/u.test(stat) && !/^(?:[\w\s./:#@-]|\$)+$/.test(stat)) {
        items.push({ kind: "tpl", text: key(node.getText(sf)), covered: false, pos: node.getStart(sf), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { file: path.relative(ROOT, file).replaceAll("\\", "/"), isClient, items };
}

async function loadBook(locale) {
  const dir = path.join(ROOT, "lib/i18n/phrases", locale);
  const book = {};
  if (!fs.existsSync(dir)) return book;
  // Les fichiers de phrases sont du TypeScript : on les lit comme des objets littéraux, sans les exécuter.
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true);
    const visit = (n) => {
      if (ts.isPropertyAssignment(n) && (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer))) {
        const name = ts.isIdentifier(n.name) ? n.name.text : ts.isStringLiteral(n.name) ? n.name.text : null;
        if (name) book[name] = n.initializer.text;
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return book;
}

async function main() {
  const args = process.argv.slice(2);
  const area = args.includes("--area") ? args[args.indexOf("--area") + 1] : "";
  const json = args.includes("--json");
  const missing = args.includes("--missing") ? args[args.indexOf("--missing") + 1] : null;
  const book = missing ? await loadBook(missing) : null;
  const everything = args.includes("--all");
  const results = walk(ROOT).map(scanFile).filter((r) => r.items.length && r.file.startsWith(area) && (everything || !EXCLUDED.some((x) => x.test(r.file))));
  const uncovered = (r) => r.items.filter((i) => !i.covered);
  let total = 0, todo = 0, untranslated = new Set();
  for (const r of results) {
    total += r.items.length;
    todo += uncovered(r).length;
    for (const i of r.items) if (book && !(i.text in book)) untranslated.add(i.text);
  }
  if (json) {
    console.log(JSON.stringify(book ? [...untranslated] : results, null, 1));
    return;
  }
  console.log(`${results.length} fichiers · ${total} textes · ${todo} pas encore branchés sur la traduction` + (book ? ` · ${untranslated.size} phrases sans traduction « ${missing} »` : ""));
  for (const r of results.sort((a, b) => uncovered(b).length - uncovered(a).length).slice(0, 25)) console.log(`${String(uncovered(r).length).padStart(4)} / ${String(r.items.length).padStart(4)}  ${r.file}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
