// Outil de traduction : branche les textes français du code sur le moteur de traduction.
//
//   node scripts/i18n/apply.mjs --area app/caisse [--dry]
//
// Transformations (toutes SANS RISQUE : un texte sans traduction s'affiche en français, comme avant) :
//   1. texte entre balises            Bonjour            ->  <T>Bonjour</T>
//   2. libellés rendus par expression {chip.label}       ->  <T>{chip.label}</T>
//   3. chaînes dans {cond ? "A" : "B"} (enfant JSX)      ->  <T>{"A"}</T>
//   4. attributs visibles (title, aria-label, placeholder…)   ->  attr={t("…")}
//   5. messages d'erreur renvoyés par une action serveur ( error: "…", message: "…" ) -> t("…")
// `t` vient de useT() (composant client) ou de `await getT()` (fonction serveur asynchrone). Quand ce
// n'est pas possible (fonction non asynchrone côté serveur), le fichier est signalé pour reprise à la main.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { isHuman } from "./scan.mjs";

const ROOT = process.env.SRC_ROOT ? path.resolve(process.env.SRC_ROOT) : path.resolve(import.meta.dirname, "../../src");
const TEXT_ATTRS = new Set(["title", "aria-label", "placeholder", "alt", "label", "hint", "description", "aria-description"]);
const LABEL_PROPS = new Set(["label", "title", "description", "hint", "text", "message", "error", "subtitle", "shortLabel", "heading"]);
const LABEL_IDENTS = new Set(["error", "message", "errorMessage", "hint", "label", "title", "subtitle", "description", "text", "heading", "shortLabel", "caption", "sub", "noun", "unit", "percentLabel", "shownUnits", "roleLabel", "legend", "tooltip"]);
const isLabelIdent = (name) => LABEL_IDENTS.has(name) || /Label$/.test(name);
// Sur un composant (balise en majuscule), ces propriétés sont affichées par le composant lui-même (via <T>) : on ne les touche pas.
const COMPONENT_PROPS = new Set(["title", "label", "hint", "description"]);
const DOM_BOUND_COMPONENTS = new Set(["Link", "Image"]);
const RET_PROPS = new Set(["error", "message"]);
const SKIP_TAGS = new Set(["code", "pre", "style", "script"]);
// Ce qui n'est PAS traduit : documents PDF, messages WhatsApp envoyés aux clients, administration de la plateforme.
const EXCLUDED = [/^lib\/documents\//, /^lib\/contract-pdf\.tsx$/, /^lib\/whatsapp\.ts$/, /^lib\/guest-info\.ts$/, /^app\/plateforme\//, /^components\/platform\//, /^lib\/i18n\//, /^components\/i18n\//];

const args = process.argv.slice(2);
const area = args.includes("--area") ? args[args.indexOf("--area") + 1] : "";
const dry = args.includes("--dry");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!["generated", "__tests__"].includes(e.name)) walk(path.join(dir, e.name), out);
    } else if (/\.(tsx|ts)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(path.join(dir, e.name));
  }
  return out;
}

const esc = (s) => JSON.stringify(s);

function processFile(file) {
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  if (!rel.startsWith(area) || EXCLUDED.some((r) => r.test(rel))) return null;
  const src = fs.readFileSync(file, "utf8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isClient = /^\s*["']use client["']/.test(src);
  const isActionFile = /^\s*["']use server["']/.test(src) || rel.startsWith("app/actions/");
  const edits = []; // { start, end, text }
  const needScope = new Map(); // fonction de haut niveau -> true
  const makeAsync = new Set();
  const report = { manual: [] };
  let usesT = false;

  const inT = (node) => {
    for (let p = node.parent; p; p = p.parent) if (ts.isJsxElement(p) && p.openingElement.tagName.getText(sf) === "T") return true;
    return false;
  };
  const topFunction = (node) => {
    let found = null;
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p)) found = p;
      if (ts.isSourceFile(p)) break;
    }
    return found;
  };
  const wantT = (node, what) => {
    const fn = topFunction(node);
    if (!fn || !fn.body || !ts.isBlock(fn.body)) {
      report.manual.push(`${what} (ligne ${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}) : pas de fonction à bloc`);
      return false;
    }
    const isAsync = fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    // Composant serveur synchrone nommé en majuscule : on le rend asynchrone (Next sait rendre un composant serveur async).
    if (!isClient && !isAsync && ts.isFunctionDeclaration(fn) && fn.name && /^[A-Z]/.test(fn.name.text) && !makeAsync.has(fn)) {
      const kw = fn.getChildren(sf).find((c) => c.kind === ts.SyntaxKind.FunctionKeyword);
      if (kw) {
        makeAsync.add(fn);
        edits.push({ start: kw.getStart(sf), end: kw.getStart(sf), text: "async " });
      }
    }
    if (!isClient && !isAsync && !makeAsync.has(fn)) {
      report.manual.push(`${what} (ligne ${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}) : fonction serveur non asynchrone`);
      return false;
    }
    needScope.set(fn, true);
    return true;
  };

  const wrapInJsx = (text) => `<T>{${esc(text)}}</T>`;

  const visit = (node) => {
    // 1. texte entre balises
    if (ts.isJsxText(node)) {
      const parent = node.parent;
      const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText(sf) : "";
      if (!SKIP_TAGS.has(tag) && tag !== "T" && !inT(node)) {
        const raw = node.getText(sf);
        if (isHuman(raw)) {
          const lead = raw.match(/^\s*/)[0];
          const trail = raw.match(/\s*$/)[0];
          const core = raw.slice(lead.length, raw.length - trail.length);
          if (!/[{}<>]/.test(core)) {
            edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `${lead}<T>${core}</T>${trail}` });
            usesT = true;
          }
        }
      }
    }
    // 2 + 3. expression enfant JSX
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) && !inT(node)) {
      const e = node.expression;
      const wrapTarget =
        (ts.isPropertyAccessExpression(e) && LABEL_PROPS.has(e.name.text)) ||
        (ts.isIdentifier(e) && isLabelIdent(e.text)) ||
        (ts.isElementAccessExpression(e) && ts.isStringLiteral(e.argumentExpression) && LABEL_PROPS.has(e.argumentExpression.text)) ||
        // {METHOD_LABELS[x]} : table de libellés
        (ts.isElementAccessExpression(e) && /LABEL|META|WORD|NAMES?$|TITLES?$|TEXTS?$/i.test(e.expression.getText(sf))) ||
        // {METHOD_LABELS[x] ?? x} / {(STATUS_META[x] ?? DEFAULT).label}
        (ts.isBinaryExpression(e) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(e.operatorToken.kind) && ts.isElementAccessExpression(e.left) && /LABEL|META|WORD|NAMES?$|TITLES?$|TEXTS?$/i.test(e.left.expression.getText(sf)));
      if (wrapTarget) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `<T>${node.getText(sf)}</T>` });
        usesT = true;
      } else if (
        ts.isBinaryExpression(e) &&
        [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(e.operatorToken.kind) &&
        [e.left, e.right].some((x) => ts.isPropertyAccessExpression(x) && LABEL_PROPS.has(x.name.text))
      ) {
        // {action.shortLabel ?? action.label} : l'expression entière est un libellé
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `<T>${node.getText(sf)}</T>` });
        usesT = true;
      } else if (ts.isConditionalExpression(e) || ts.isBinaryExpression(e)) {
        // chaînes littérales dans les branches de premier niveau
        const lits = [];
        const collect = (x) => {
          if (ts.isParenthesizedExpression(x)) return collect(x.expression);
          if (ts.isConditionalExpression(x)) { collect(x.whenTrue); collect(x.whenFalse); return; }
          if (ts.isBinaryExpression(x) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(x.operatorToken.kind)) { collect(x.right); if (x.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) collect(x.left); return; }
          if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) lits.push(x);
        };
        collect(e);
        for (const lit of lits) {
          if (isHuman(lit.text)) {
            edits.push({ start: lit.getStart(sf), end: lit.getEnd(), text: wrapInJsx(lit.text) });
            usesT = true;
          }
        }
      }
    }
    // 4. attributs visibles
    const owner = ts.isJsxAttribute(node) ? node.parent?.parent : null;
    const ownerTag = owner && (ts.isJsxOpeningElement(owner) || ts.isJsxSelfClosingElement(owner)) ? owner.tagName.getText(sf) : "";
    const isComponentTag = /^[A-Z]/.test(ownerTag) && !DOM_BOUND_COMPONENTS.has(ownerTag);
    if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && !(isComponentTag && COMPONENT_PROPS.has(node.name.getText(sf))) && node.initializer && ts.isStringLiteral(node.initializer) && isHuman(node.initializer.text)) {
      if (wantT(node, `attribut ${node.name.getText(sf)}`)) {
        edits.push({ start: node.initializer.getStart(sf), end: node.initializer.getEnd(), text: `{t(${esc(node.initializer.text)})}` });
      }
    }
    // 4 bis. attributs visibles dont la valeur est une expression : title={`…${x}…`}, aria-label={cond ? "A" : "B"}
    if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && !(isComponentTag && COMPONENT_PROPS.has(node.name.getText(sf))) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const e = node.initializer.expression;
      const lits = [];
      const collectAttr = (x) => {
        if (ts.isParenthesizedExpression(x)) return collectAttr(x.expression);
        if (ts.isConditionalExpression(x)) { collectAttr(x.whenTrue); collectAttr(x.whenFalse); return; }
        if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || ts.isTemplateExpression(x)) lits.push(x);
      };
      collectAttr(e);
      for (const lit of lits) {
        const raw = ts.isTemplateExpression(lit) ? lit.getText(sf) : lit.text;
        const human = ts.isTemplateExpression(lit) ? /[À-ÿ]|(le|la|les|des|du|un|une|aucun|aucune|pour|sur|dans|avec|est|pas|ce|cette|au|ou|et)/i.test(raw) : isHuman(lit.text);
        if (human && wantT(node, `attribut ${node.name.getText(sf)}`)) {
          edits.push({ start: lit.getStart(sf), end: lit.getEnd(), text: `t(${ts.isTemplateExpression(lit) ? lit.getText(sf) : esc(lit.text)})` });
        }
      }
    }
    // 4 quater. attributs visibles alimentés par un libellé : title={action.hint}, placeholder={cfg.searchPlaceholder}
    if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && !(isComponentTag && COMPONENT_PROPS.has(node.name.getText(sf))) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const e = node.initializer.expression;
      const labelish = (ts.isPropertyAccessExpression(e) && (LABEL_PROPS.has(e.name.text) || /Label$|Placeholder$|Hint$|Title$/.test(e.name.text))) || (ts.isIdentifier(e) && isLabelIdent(e.text));
      if (labelish && wantT(node, `attribut ${node.name.getText(sf)}`)) edits.push({ start: e.getStart(sf), end: e.getEnd(), text: `t(${e.getText(sf)})` });
    }
    // 4 ter. confirm("…") : boîte de dialogue du navigateur
    if (ts.isCallExpression(node) && ["confirm", "window.confirm"].includes(node.expression.getText(sf)) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]) || ts.isTemplateExpression(node.arguments[0])) && wantT(node, "confirm")) {
      edits.push({ start: node.arguments[0].getStart(sf), end: node.arguments[0].getEnd(), text: `t(${node.arguments[0].getText(sf)})` });
    }
    // 5. messages renvoyés par une action serveur
    if (isActionFile && ts.isPropertyAssignment(node) && RET_PROPS.has(node.name.getText(sf)) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) && isHuman(node.initializer.text)) {
      if (topFunction(node) && wantT(node, `message ${node.name.getText(sf)}`)) {
        edits.push({ start: node.initializer.getStart(sf), end: node.initializer.getEnd(), text: `t(${esc(node.initializer.text)})` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (edits.length === 0) return { rel, changed: 0, manual: report.manual };

  // scope : const t = ...
  const needsHook = needScope.size > 0;
  for (const fn of needScope.keys()) {
    const body = fn.body;
    if (/\bconst t\s*=/.test(body.getText(sf))) continue;
    const line = isClient ? "const t = useT();" : "const t = await getT();";
    edits.push({ start: body.getStart(sf) + 1, end: body.getStart(sf) + 1, text: `${eol}  ${line}` });
  }
  // imports
  const names = [];
  if (usesT) names.push("T");
  if (needsHook && isClient) names.push("useT");
  const importLines = [];
  if (names.length) {
    const already = src.match(/import \{([^}]*)\} from "@\/components\/i18n\/i18n-provider";/);
    if (!already) importLines.push(`import { ${names.join(", ")} } from "@/components/i18n/i18n-provider";`);
    else {
      const have = already[1].split(",").map((x) => x.trim()).filter(Boolean);
      const merged = [...new Set([...have, ...names])];
      if (merged.length !== have.length) edits.push({ start: src.indexOf(already[0]), end: src.indexOf(already[0]) + already[0].length, text: `import { ${merged.join(", ")} } from "@/components/i18n/i18n-provider";` });
    }
  }
  if (needsHook && !isClient && !/from "@\/lib\/i18n\/server"/.test(src)) importLines.push(`import { getT } from "@/lib/i18n/server";`);
  if (importLines.length) {
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const pos = imports.length ? imports[imports.length - 1].getEnd() : (/^\s*["']use (client|server)["'];?/.test(src) ? src.indexOf(";") + 1 : 0);
    edits.push({ start: pos, end: pos, text: `${eol}${importLines.join(eol)}` });
  }

  // application (de la fin vers le début)
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  if (!dry) fs.writeFileSync(file, out);
  return { rel, changed: edits.length, manual: report.manual };
}

let files = 0, total = 0;
const manual = [];
for (const f of walk(ROOT)) {
  const r = processFile(f);
  if (!r) continue;
  if (r.changed) { files++; total += r.changed; }
  for (const m of r.manual) manual.push(`${r.rel}: ${m}`);
}
console.log(`${dry ? "(simulation) " : ""}${files} fichiers modifiés · ${total} remplacements · ${manual.length} à reprendre à la main`);
for (const m of manual.slice(0, 40)) console.log("  - " + m);
