// Traduction par PHRASE : le texte français sert de clé. Module PUR (aucune dépendance serveur) :
// importable depuis un composant serveur, un composant client, une action ou un test.
//
// Pourquoi par phrase : l'application compte plus de deux mille textes écrits en français dans le
// code. Garder le français comme clé permet de traduire écran par écran sans rien casser : une
// phrase sans traduction s'affiche telle quelle, en français (jamais une clé technique, jamais un
// blanc). Pour une nouvelle langue, il suffit d'ajouter ses phrases dans `phrases/<langue>/`.
//
// Deux sortes de phrases :
//  - exactes :   "Enregistrer" -> "Save"
//  - à valeurs : "{n} règlement(s)" -> "{n} payment(s)". Le texte déjà assemblé par le code
//    (« 5 règlement(s) ») est reconnu par sa forme, sans rien changer au code qui l'a fabriqué. Une valeur
//    reconnue elle-même comme une phrase est traduite à son tour (« client » -> « guest »).

/** « Bonjour {name} » + { name: "Awa" }. Une variable absente reste visible, jamais remplacée par du vide. */
function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export type PhraseBook = Readonly<Record<string, string>>;

/** Clé de recherche : espaces multiples et retours à la ligne ramenés à un seul espace, bords retirés. */
export function phraseKey(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

type Pattern = { re: RegExp; names: string[]; en: string };
const PLACEHOLDER = /\{(\w+)\}/g;
const compiled = new WeakMap<PhraseBook, Pattern[]>();

/** Les phrases à valeurs d'un recueil, compilées une seule fois. Les plus longues d'abord (les plus précises). */
function patternsOf(book: PhraseBook): Pattern[] {
  const cached = compiled.get(book);
  if (cached) return cached;
  const patterns: Pattern[] = [];
  for (const key of Object.keys(book)) {
    if (!PLACEHOLDER.test(key)) continue;
    PLACEHOLDER.lastIndex = 0;
    const names: string[] = [];
    let source = "";
    let last = 0;
    for (const m of key.matchAll(PLACEHOLDER)) {
      source += key.slice(last, m.index).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      source += "(.+?)";
      names.push(m[1]);
      last = (m.index ?? 0) + m[0].length;
    }
    source += key.slice(last).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push({ re: new RegExp(`^${source}$`), names, en: book[key] });
  }
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  compiled.set(book, patterns);
  return patterns;
}

function lookup(book: PhraseBook, key: string, depth: number): string | undefined {
  if (Object.prototype.hasOwnProperty.call(book, key) && !PLACEHOLDER.test(key)) {
    PLACEHOLDER.lastIndex = 0;
    return book[key];
  }
  PLACEHOLDER.lastIndex = 0;
  if (depth > 2) return undefined;
  for (const p of patternsOf(book)) {
    const m = p.re.exec(key);
    if (!m) continue;
    const values: Record<string, string> = {};
    p.names.forEach((name, i) => {
      const raw = m[i + 1];
      values[name] = lookup(book, phraseKey(raw), depth + 1) ?? raw;
    });
    return format(p.en, values);
  }
  return undefined;
}

/**
 * Traduit `text` avec `book`. Les espaces de début et de fin sont conservés (un fragment de JSX comme
 * « Bonjour, » garde son espace avant l'expression qui suit). `values` remplace les `{variables}`.
 */
export function translate(book: PhraseBook, text: string, values?: Record<string, string | number>): string {
  const key = phraseKey(text);
  if (key.length === 0) return text;
  const base = lookup(book, key, 0) ?? key;
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  const body = values ? format(base, values) : base;
  return `${lead}${body}${trail}`;
}

export type TFunction = (text: string, values?: Record<string, string | number>) => string;

export function createT(book: PhraseBook): TFunction {
  return (text, values) => translate(book, text, values);
}
