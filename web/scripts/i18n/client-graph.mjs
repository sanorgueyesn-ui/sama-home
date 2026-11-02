// Vérifie qu'aucun module accessible depuis un composant client n'importe `lib/i18n/server` (réservé au serveur).
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(process.env.SRC_ROOT ?? path.resolve(import.meta.dirname, "../../src"));
const exts = [".tsx", ".ts", "/index.tsx", "/index.ts"];
function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const e of ["", ...exts]) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return base + e;
  return null;
}
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!["generated", "__tests__"].includes(e.name)) walk(path.join(d, e.name), out); }
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(path.join(d, e.name));
  }
  return out;
}
const importsOf = (file) => {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const list = [];
  sf.forEachChild((n) => { if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && !n.importClause?.isTypeOnly) list.push(n.moduleSpecifier.text); });
  return list;
};
const files = walk(ROOT);
const isClient = (f) => /^\s*["']use client["']/.test(fs.readFileSync(f, "utf8"));
const bad = new Map();
for (const start of files.filter(isClient)) {
  const seen = new Set();
  const stack = [[start, [start]]];
  while (stack.length) {
    const [f, chain] = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    // Un module « use server » est une frontière : le client n'en reçoit qu'une référence, jamais son code.
    if (f !== start && /^\s*["']use server["']/.test(fs.readFileSync(f, "utf8"))) continue;
    for (const spec of importsOf(f)) {
      if (/i18n\/server$/.test(spec) || spec === "server-only") { if (!bad.has(f)) bad.set(f, chain); continue; }
      const r = resolve(f, spec);
      if (r && !seen.has(r)) stack.push([r, [...chain, r]]);
    }
  }
}
for (const [f, chain] of bad) console.log(path.relative(ROOT, f), "<=", chain.map((c) => path.relative(ROOT, c)).slice(0, 3).join(" > "));
console.log(bad.size ? `${bad.size} module(s) côté client importent du code serveur` : "OK : aucun module client n'importe de code serveur");
