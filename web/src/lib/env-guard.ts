/**
 * Garde commune contre l'usage accidentel de la base de PRODUCTION par les
 * outils de développement et de test (serveur `next dev`, CLI Prisma,
 * scripts `scripts/*.mts`, seed).
 *
 * Module volontairement PUR : aucun import, aucune connexion, aucun accès
 * disque ni réseau — la décision est prise uniquement à partir de l'URL et
 * des variables passées en paramètre, AVANT toute connexion. Tout ce qui est
 * absent, illisible ou ambigu est REFUSÉ (échec sûr).
 *
 * DEUX PROCÉDURES DISTINCTES, jamais mélangées :
 *
 * A. Opérations LOCALES (développement, tests) — `evaluateEnvironment` :
 *  1. `SAMA_ENV` doit valoir exactement "local" (déclaré dans
 *     `.env.development.local`, jamais dans `.env`).
 *  2. `NODE_ENV` ne doit pas valoir "production" (et NE désactive JAMAIS la
 *     garde : avoir `NODE_ENV=production` ne fait que refuser davantage).
 *  3. L'URL doit être postgres(ql):// et son hôte EXACTEMENT l'un de
 *     LOCAL_HOSTS (pas de sous-chaîne : `127.0.0.1.exemple.com` est refusé).
 *  4. Le port doit être explicite et figurer dans ALLOWED_LOCAL_PORTS
 *     (constante dans le code : la changer exige une modification relue).
 *  5. Aucun paramètre de chaîne de connexion pouvant remplacer la cible
 *     (`host`, `hostaddr`, `port`, `service`, `options`), quelle que soit la
 *     casse, n'est toléré.
 *  6. `DIRECT_URL`, si elle est définie, est soumise aux mêmes règles.
 *  7. Les variables ambiantes libpq `PGHOST`, `PGHOSTADDR`, `PGPORT`, si
 *     elles sont définies, doivent elles aussi désigner une cible locale.
 *
 * B. Déploiement de production — `evaluateDeployTarget`, utilisé UNIQUEMENT
 *    par scripts/deploy/prisma-deploy.config.ts (appelé explicitement avec
 *    `--config`, jamais découvert automatiquement). Il n'assouplit pas A : il
 *    exige au contraire une cible DISTANTE confirmée par l'opérateur
 *    (`SAMA_DEPLOY_TARGET_HOST` = hôte exact de l'URL), refuse toute cible
 *    locale et ne lit jamais `.env`.
 *
 * LIMITE ASSUMÉE : la procédure A prouve que la cible est UNE BASE LOCALE,
 * pas que ses données sont fictives — une copie de la production restaurée
 * en local passe la garde. Garde complémentaire : marqueur de base de test
 * (TEST_DB_MARKER), vérifié par scripts/lib/db-marker.mts.
 */

export const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"] as const;

/** 2026 : PostgreSQL local existant ; 55417 : PostgreSQL 17 isolé (Docker). */
export const ALLOWED_LOCAL_PORTS = [2026, 55417] as const;

/** Commentaire de base (`COMMENT ON DATABASE`) identifiant une base de test SAMA HOME. */
export const TEST_DB_MARKER = "SAMA-HOME-LOCAL-TEST-ONLY";

const FORBIDDEN_CONNECTION_PARAMS = ["host", "hostaddr", "port", "service", "options"] as const;

export class UnsafeTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTargetError";
  }
}

export type TargetVerdict = { ok: true; hostPort: string } | { ok: false; reason: string };

type Env = Readonly<Record<string, string | undefined>>;

const isLocalHost = (host: string) => (LOCAL_HOSTS as readonly string[]).includes(host.toLowerCase());
const isAllowedLocalPort = (port: number) => (ALLOWED_LOCAL_PORTS as readonly number[]).includes(port);

function parseUrl(rawUrl: string | undefined, label: string): { url: URL } | { error: string } {
  if (!rawUrl || rawUrl.trim() === "") return { error: `${label} est absente ou vide.` };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: `${label} est illisible (URL invalide).` };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return { error: `${label} : protocole inattendu.` };
  }
  return { url };
}

function overridingParam(url: URL): string | undefined {
  const keys = Array.from(url.searchParams.keys()).map((k) => k.toLowerCase());
  return FORBIDDEN_CONNECTION_PARAMS.find((p) => keys.includes(p));
}

/** Évalue une URL de connexion (procédure A). Ne renvoie JAMAIS les identifiants. */
export function evaluateDatabaseUrl(rawUrl: string | undefined, label: string): TargetVerdict {
  const parsed = parseUrl(rawUrl, label);
  if ("error" in parsed) return { ok: false, reason: parsed.error };
  const { url } = parsed;

  const host = url.hostname.toLowerCase();
  if (!isLocalHost(host)) {
    return { ok: false, reason: `${label} : l'hôte "${host}" n'est pas une machine locale autorisée.` };
  }

  const param = overridingParam(url);
  if (param) {
    return { ok: false, reason: `${label} : le paramètre "${param}" pourrait remplacer la cible — refusé.` };
  }

  if (url.port === "") {
    return { ok: false, reason: `${label} : le port doit être explicite.` };
  }
  const port = Number(url.port);
  if (!Number.isInteger(port) || !isAllowedLocalPort(port)) {
    return { ok: false, reason: `${label} : le port ${url.port} n'est pas dans la liste d'autorisation locale.` };
  }

  return { ok: true, hostPort: `${host}:${port}` };
}

/** Variables libpq ambiantes : si présentes, elles ne doivent pas désigner autre chose qu'une cible locale. */
function evaluateAmbientPgEnv(env: Env): TargetVerdict | null {
  for (const key of ["PGHOST", "PGHOSTADDR"] as const) {
    const value = env[key];
    if (value !== undefined && value !== "" && !isLocalHost(value)) {
      return { ok: false, reason: `${key} désigne une cible non locale.` };
    }
  }
  const pgPort = env.PGPORT;
  if (pgPort !== undefined && pgPort !== "" && !isAllowedLocalPort(Number(pgPort))) {
    return { ok: false, reason: "PGPORT n'est pas dans la liste d'autorisation locale." };
  }
  return null;
}

/** Évalue l'environnement complet pour une opération LOCALE (règles 1 à 7). */
export function evaluateEnvironment(env: Env): TargetVerdict {
  if (env.SAMA_ENV !== "local") {
    return {
      ok: false,
      reason:
        'SAMA_ENV n\'est pas "local". Une configuration de développement explicite (.env.development.local) est obligatoire.',
    };
  }
  if (env.NODE_ENV === "production") {
    return { ok: false, reason: "NODE_ENV=production : les outils de développement n'ont pas le droit de s'exécuter." };
  }

  const main = evaluateDatabaseUrl(env.DATABASE_URL, "DATABASE_URL");
  if (!main.ok) return main;

  // Nom de base ATTENDU (SAMA_EXPECTED_DB, déclaré dans .env.development.local) :
  // épingle la cible sur UNE base précise — jamais déduit de l'URL seule.
  const expectedDb = env.SAMA_EXPECTED_DB?.trim();
  if (!expectedDb) {
    return { ok: false, reason: "SAMA_EXPECTED_DB (nom de la base attendue) est absent." };
  }
  const dbNameOf = (raw: string) => decodeURIComponent(new URL(raw).pathname.replace(/^\//, ""));
  if (dbNameOf(env.DATABASE_URL as string) !== expectedDb) {
    return { ok: false, reason: "DATABASE_URL ne désigne pas la base attendue (SAMA_EXPECTED_DB)." };
  }

  if (env.DIRECT_URL !== undefined && env.DIRECT_URL !== "") {
    const direct = evaluateDatabaseUrl(env.DIRECT_URL, "DIRECT_URL");
    if (!direct.ok) return direct;
    if (dbNameOf(env.DIRECT_URL) !== expectedDb) {
      return { ok: false, reason: "DIRECT_URL ne désigne pas la base attendue (SAMA_EXPECTED_DB)." };
    }
  }

  const ambient = evaluateAmbientPgEnv(env);
  if (ambient) return ambient;

  return main;
}

/** Lève UnsafeTargetError si la cible n'est pas explicitement autorisée (procédure A). */
export function assertSafeDevelopmentTarget(env: Env, context: string): { hostPort: string } {
  const verdict = evaluateEnvironment(env);
  if (!verdict.ok) {
    throw new UnsafeTargetError(
      `[GARDE PRODUCTION] ${context} REFUSÉ — ${verdict.reason} ` +
        "Aucune connexion n'a été ouverte. Voir docs/production/LOCAL_DEV_ISOLATION.md.",
    );
  }
  return { hostPort: verdict.hostPort };
}

/**
 * Procédure B — déploiement de production explicite. N'est jamais appelée
 * par les outils de développement. Refuse toute cible locale, exige que
 * l'opérateur déclare l'hôte attendu, et ne tolère aucun paramètre de
 * redirection de connexion.
 */
export function evaluateDeployTarget(env: Env): TargetVerdict {
  if (env.SAMA_ENV === "local") {
    return { ok: false, reason: 'SAMA_ENV="local" : un déploiement ne peut pas partir d\'un environnement de développement.' };
  }
  const expected = env.SAMA_DEPLOY_TARGET_HOST?.trim().toLowerCase();
  if (!expected) {
    return { ok: false, reason: "SAMA_DEPLOY_TARGET_HOST (hôte attendu) est absent." };
  }
  if (isLocalHost(expected)) {
    return { ok: false, reason: "SAMA_DEPLOY_TARGET_HOST ne peut pas être une machine locale." };
  }

  const checkOne = (raw: string | undefined, label: string): TargetVerdict => {
    const parsed = parseUrl(raw, label);
    if ("error" in parsed) return { ok: false, reason: parsed.error };
    const { url } = parsed;
    const host = url.hostname.toLowerCase();
    if (host !== expected) {
      return { ok: false, reason: `${label} : l'hôte ne correspond pas à SAMA_DEPLOY_TARGET_HOST.` };
    }
    const param = overridingParam(url);
    if (param) {
      return { ok: false, reason: `${label} : le paramètre "${param}" pourrait remplacer la cible — refusé.` };
    }
    if (url.port === "" || !Number.isInteger(Number(url.port))) {
      return { ok: false, reason: `${label} : le port doit être explicite.` };
    }
    return { ok: true, hostPort: `${host}:${url.port}` };
  };

  const main = checkOne(env.DATABASE_URL, "DATABASE_URL");
  if (!main.ok) return main;
  if (env.DIRECT_URL !== undefined && env.DIRECT_URL !== "") {
    const direct = checkOne(env.DIRECT_URL, "DIRECT_URL");
    if (!direct.ok) return direct;
  }
  return main;
}

export function assertDeployTarget(env: Env, context: string): { hostPort: string } {
  const verdict = evaluateDeployTarget(env);
  if (!verdict.ok) {
    throw new UnsafeTargetError(`[GARDE DÉPLOIEMENT] ${context} REFUSÉ — ${verdict.reason} Aucune connexion n'a été ouverte.`);
  }
  return { hostPort: verdict.hostPort };
}

/**
 * Cible du script de bootstrap de l'administrateur de plateforme
 * (scripts/bootstrap-platform-admin.mts). Deux modes jamais mélangés :
 *
 *  - LOCAL (défaut, y compris en simple vérification) : exige la garde de
 *    développement complète (`evaluateEnvironment`). Une cible distante est
 *    refusée dans tous les cas. En écriture, `--target-host=<hôte>` doit en
 *    plus égaler l'hôte local de DATABASE_URL.
 *  - PRODUCTION (jamais par défaut) : exige `--production` ET la procédure de
 *    déploiement (`evaluateDeployTarget`, qui lit SAMA_DEPLOY_TARGET_HOST dans
 *    l'ENVIRONNEMENT du processus) ET `--target-host=<hôte>` égal à cet hôte.
 *    Le drapeau seul ne suffit donc jamais : la confirmation d'environnement
 *    ne peut pas être dérivée de l'argument qu'elle doit confirmer. Appliqué
 *    aussi en simple vérification (qui lit la base de production).
 */
export type BootstrapTargetVerdict =
  | { ok: true; mode: "local" | "production"; hostPort: string }
  | { ok: false; reason: string };

export function evaluateBootstrapTarget(argv: readonly string[], env: Env): BootstrapTargetVerdict {
  const production = argv.includes("--production");
  const write = argv.includes("--write");
  const flag = argv
    .find((a) => a.startsWith("--target-host="))
    ?.slice("--target-host=".length)
    .trim()
    .toLowerCase();

  const urlHost = (): string | null => {
    try {
      return new URL(env.DATABASE_URL ?? "").hostname.toLowerCase();
    } catch {
      return null;
    }
  };

  if (!production) {
    const verdict = evaluateEnvironment(env);
    if (!verdict.ok) return verdict;
    if (write && (!flag || flag !== urlHost())) {
      return { ok: false, reason: "--write exige --target-host=<hôte local exact de DATABASE_URL>." };
    }
    return { ok: true, mode: "local", hostPort: verdict.hostPort };
  }

  const verdict = evaluateDeployTarget(env);
  if (!verdict.ok) return verdict;
  if (!flag || flag !== urlHost()) {
    return { ok: false, reason: "--production exige --target-host=<hôte exact de DATABASE_URL>, en plus de SAMA_DEPLOY_TARGET_HOST." };
  }
  return { ok: true, mode: "production", hostPort: verdict.hostPort };
}

/** Un commentaire de base n'identifie une base de test que s'il vaut EXACTEMENT TEST_DB_MARKER. */
export function isValidTestMarker(comment: string | null | undefined): boolean {
  return comment === TEST_DB_MARKER;
}

/**
 * Cible d'un stockage objet (S3) pour un script qui y écrit : l'endpoint doit
 * être explicite et LOCAL (émulateur local). Un endpoint absent (SDK par
 * défaut = AWS réel) ou distant est refusé.
 */
export function evaluateObjectStorageEndpoint(env: Env): TargetVerdict {
  const raw = env.AWS_ENDPOINT_URL;
  if (!raw || raw.trim() === "") {
    return { ok: false, reason: "AWS_ENDPOINT_URL est absent : le SDK viserait le service réel." };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "AWS_ENDPOINT_URL est illisible." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "AWS_ENDPOINT_URL : protocole inattendu." };
  }
  if (!isLocalHost(url.hostname)) {
    return { ok: false, reason: `AWS_ENDPOINT_URL : l'hôte "${url.hostname.toLowerCase()}" n'est pas local.` };
  }
  return { ok: true, hostPort: `${url.hostname.toLowerCase()}:${url.port || "(défaut)"}` };
}

export function assertLocalObjectStorage(env: Env, context: string): void {
  const verdict = evaluateObjectStorageEndpoint(env);
  if (!verdict.ok) {
    throw new UnsafeTargetError(
      `[GARDE STOCKAGE] ${context} REFUSÉ — ${verdict.reason} Aucune écriture n'a été tentée.`,
    );
  }
}
