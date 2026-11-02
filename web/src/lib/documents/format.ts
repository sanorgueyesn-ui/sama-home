// Mises en forme communes aux documents PDF (contrats, quittances, tickets). Module PUR.
// Polices PDF standard : pas de caractères hors du jeu Windows-1252 (ni « → » ni « ✓ »).

/** « 36 000 FCFA » : espaces simples, jamais d'espace insécable fine (absente des polices PDF standard). */
export function fmtMoney(amount: number): string {
  return `${fmtNumber(amount)} FCFA`;
}

export function fmtNumber(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** « 29 octobre 2026 » */
export function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** « jeudi 29 octobre 2026 » */
export function fmtDateWithDay(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** « 14 h 00 » */
export function fmtTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")} h ${String(date.getMinutes()).padStart(2, "0")}`;
}

/** « 29 octobre 2026 à 14 h 00 » */
export function fmtDateTime(date: Date): string {
  return `${fmtDate(date)} à ${fmtTime(date)}`;
}

/** « 29/10/2026 14:05 » : compact, pour les tickets étroits. */
export function fmtShortDateTime(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** « novembre 2026 » */
export function fmtMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
  "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** `final` : le nombre se termine ici (« quatre-vingts », « deux cents » prennent alors leur s). */
function below100(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7) return unit === 1 ? "soixante et onze" : `soixante-${UNITS[10 + unit]}`;
  if (ten === 8) return unit === 0 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITS[unit]}`;
  if (ten === 9) return `quatre-vingt-${UNITS[10 + unit]}`;
  if (unit === 0) return TENS[ten];
  if (unit === 1) return `${TENS[ten]} et un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

function below1000(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let words = "";
  if (hundreds > 0) {
    words = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
    if (rest === 0 && hundreds > 1 && final) words += "s";
  }
  if (rest > 0) words += (words ? " " : "") + below100(rest, final);
  return words;
}

/**
 * Montant en toutes lettres, orthographe française : « deux cent soixante-douze mille », « quatre-vingts »,
 * « mille deux cents ». Entiers de 0 à 999 999 999 999 ; au-delà ou non entier : refusé (on n'imprime pas
 * un montant en lettres faux sur un document financier).
 */
export function amountInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0 || amount > 999_999_999_999) {
    throw new RangeError("Montant en lettres : entier de 0 à 999 999 999 999 attendu.");
  }
  if (amount === 0) return UNITS[0];
  const billions = Math.floor(amount / 1_000_000_000);
  const millions = Math.floor((amount % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((amount % 1_000_000) / 1000);
  const rest = amount % 1000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions > 0) parts.push(`${below1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest > 0) parts.push(below1000(rest, true));
  return parts.join(" ");
}

/** « Deux cent soixante-douze mille francs CFA » : première lettre en capitale, devise accordée. */
export function amountInWordsCfa(amount: number): string {
  const words = amountInWords(amount);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} franc${amount > 1 ? "s" : ""} CFA`;
}

/** « deux cent soixante-douze mille francs CFA » : au fil d'une phrase, le sigle CFA reste en capitales. */
export function amountInWordsCfaInline(amount: number): string {
  return `${amountInWords(amount)} franc${amount > 1 ? "s" : ""} CFA`;
}
