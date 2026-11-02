// Garde-fou : tout texte français affiché via <T>…</T> ou t("…") doit avoir sa traduction anglaise.
// Sinon l'anglais afficherait du français à cet endroit (voir config.ts : jamais de traduction à moitié faite).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPhraseBook } from "../i18n/phrases";
import { phraseKey } from "../i18n/translate";

const ROOT = path.resolve(import.meta.dirname, "../..");
// Hors périmètre de la traduction de l'interface (PDF, messages WhatsApp, outils de développement, plateforme).
const EXCLUDED = [
  "lib/i18n", "lib/documents", "lib/contract-pdf", "lib/whatsapp", "lib/guest-info", "__tests__",
  "app/plateforme", "components/platform", "components/i18n", "generated", "mail",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const decode = (s: string) => s.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "’");
const STR = '"((?:[^"\\\\\\n]|\\\\.)*)"';
const PATTERNS: Array<{ re: RegExp; json: boolean }> = [
  { re: new RegExp(`<T>\\s*\\{${STR}\\}\\s*</T>`, "g"), json: true },
  { re: /<T>\s*\{`([^`$]*)`\}\s*<\/T>/g, json: false },
  { re: /<T>([^<>{}]+)<\/T>/g, json: false },
  { re: new RegExp(`\\bt\\(${STR}[,)]`, "g"), json: true },
  { re: /\bt\(`([^`$]*)`[,)]/g, json: false },
];

test("chaque phrase affichée via <T> / t() a une traduction anglaise", () => {
  const book = getPhraseBook("en");
  const missing = new Map<string, string>();
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (EXCLUDED.some((e) => rel.includes(e))) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const { re, json } of PATTERNS) {
      for (const m of src.matchAll(re)) {
        let text = m[1];
        if (json) {
          try { text = JSON.parse(`"${text}"`); } catch { /* garde le texte brut */ }
        }
        const key = phraseKey(decode(text));
        if (key.length < 2 || !/[A-Za-zÀ-ÿ]/.test(key)) continue;
        if (/^[),.:;]/.test(key) || key.endsWith("(") || key.endsWith("«")) continue; // fragment de phrase
        if (!(key in book)) missing.set(key, rel);
      }
    }
  }
  const list = [...missing].map(([k, f]) => `${f}: ${k}`);
  assert.equal(list.length, 0, `Phrases sans traduction anglaise :\n${list.slice(0, 40).join("\n")}`);
});
