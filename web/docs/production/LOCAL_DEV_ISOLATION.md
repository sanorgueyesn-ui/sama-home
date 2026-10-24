# Isolation du développement local vis-à-vis de la production

La base Supabase de `web/.env` est la **production** et contient de vrais clients. Aucun outil de développement ou de test ne doit pouvoir l'écrire ni exporter ses données par inadvertance.

Deux chemins distincts, jamais mélangés :

- **Chemin LOCAL** (développement, tests, migrations de test) : décrit ci-dessous.
- **Chemin de DÉPLOIEMENT de production** : `scripts/deploy/prisma-deploy.config.ts` et `npm run backup -- --export-production=<hôte>` ; voir `DEPLOY.md`.

## Chemin local

### Environnement

- Conteneur `samahome-pg17-local` (PostgreSQL 17, image `postgres:17`), lié à `127.0.0.1:55417` uniquement, volume dédié `samahome_pg17_data`, base `samahome_local_v17`. Identifiants locaux dédiés, sans lien avec la production.
- `.env.development.local` (ignoré par Git) : `SAMA_ENV=local`, `SAMA_EXPECTED_DB=samahome_local_v17`, base locale, `SESSION_SECRET` fictif, S3 / SMTP / relais e-mail / Google **inertes**. `next dev` l'applique par-dessus `.env` ; les scripts et le CLI Prisma le chargent explicitement (`override`). Le contenu réel de ces fichiers et du conteneur n'est pas vérifiable depuis le dépôt (fichiers ignorés par Git).
- `.env.p207-test.local` (ignoré par Git) : valeurs de production remplacées par des valeurs inertes (phase 0.6) ; seule `DATABASE_URL` (base de test locale, port 2026) est conservée.

### Garde de cible (`src/lib/env-guard.ts`, module pur)

Refus par défaut ; toutes les règles sont obligatoires, aucune ne repose sur le nom de la base seul :

1. `SAMA_ENV=local` ; `NODE_ENV` jamais `production` (il ne désactive **jamais** la garde).
2. Hôte **exactement** `127.0.0.1`, `localhost` ou `::1`.
3. Port explicite dans `ALLOWED_LOCAL_PORTS` (2026, 55417).
4. Aucun paramètre d'URL redirigeant la connexion (`host`, `hostaddr`, `port`, `service`, `options`, toute casse).
5. `SAMA_EXPECTED_DB` obligatoire et égal au nom de la base de `DATABASE_URL` **et** de `DIRECT_URL`.
6. `DIRECT_URL` soumise aux mêmes règles ; `PGHOST` / `PGHOSTADDR` / `PGPORT` ambiants non locaux refusés.

### Où la garde s'applique

| Point d'entrée | Fichier | Effet |
|---|---|---|
| `next dev` | `src/lib/prisma.ts` | Le client Prisma n'est pas créé si la garde refuse (`NODE_ENV=development`). `next build` / `next start` ne sont pas affectés. La garde vérifie la **cible** (hôte, port, base attendue) mais **pas le marqueur de base de test** : `next dev` ne garantit pas à lui seul que la base utilisée par l'application est marquée. |
| CLI Prisma | `prisma7.config.ts` | Toute commande hors `generate`, `validate`, `format`, `version`, `help` exige la garde **puis le marqueur de base de test** (vérifié en lecture seule par `scripts/lib/check-test-marker.cjs`). Un contrôle d'exécution (`NODE_ENV=production` refusé, base locale non marquée refusée) avait été noté lors de la mise en place ; il n'a pas été rejoué pour cette révision de la documentation. |
| Scripts | `scripts/lib/safe-env.mts` | Charge `.env.development.local` puis applique la garde avant tout autre code. Importé (modifications commitées) par `restore-db`, `prisma/seed.ts`, `prisma/backfill-payments.ts`, `list-all-users`, `inspect-db`, `test-forgot-password-flow`, `mark-test-database`, `migrate-local`, `__p118-seed-test-data`, `__p187-inventory`, `__p187-seed-b`, `integration-test-bucket`, les 19 scripts Playwright `__p*` et 3 des 4 scripts neutralisés (`clean-production-db`, `create-password-reset-table`, `add-permissions-column`). Voir « Classement des scripts » pour `purge-test-users.mts` et `test-purged-email.mts`, dont les gardes ne sont pas commitées. |
| Scripts exigeant le marqueur | `scripts/lib/db-marker.mts` | Exigent en plus le marqueur (et la base attendue) : `prisma/seed.ts`, `__p118-seed-test-data`, `__p187-seed-b`, `test-forgot-password-flow`, `migrate-local`, `bootstrap-platform-admin` (mode local) et le CLI Prisma (via `check-test-marker.cjs`). `clean-production-db` l'exige aussi dans son code, derrière la neutralisation. |
| Stockage objet | `scripts/lib/safe-storage.mts` | `integration-test-bucket.mts` : endpoint S3 explicitement local obligatoire. Les autres tests S3 utilisent de faux clients. |
| Sauvegarde | `scripts/backup-db.mts` | Mode **local** par défaut (garde de cible locale, fichiers dans `backups/local/`). L'export de production exige `--export-production=<hôte exact de DATABASE_URL>`. |
| Bootstrap administrateur | `scripts/bootstrap-platform-admin.mts` | La cible est vérifiée avant toute connexion, **y compris en simple vérification** (sans écriture) : mode local par défaut (garde de développement puis marqueur) ; mode production seulement avec `--production`, `SAMA_DEPLOY_TARGET_HOST` (environnement) et `--target-host`. `--write` exige en plus `--target-host=<hôte exact de DATABASE_URL>` et `BOOTSTRAP_PLATFORM_ADMIN_CONFIRM`. Voir [BOOTSTRAP_PLATFORM_ADMIN.md](./BOOTSTRAP_PLATFORM_ADMIN.md), section 4. |
| Test de connexion | `check-production-db.cjs` | Session PostgreSQL strictement en lecture seule ; ne charge pas `.env` (la variable doit être posée volontairement). |

### Marqueur de base de test

`COMMENT ON DATABASE` = `SAMA-HOME-LOCAL-TEST-ONLY`, posé uniquement sur une base **vide** par `npm run db:mark-test -- <base> [--apply]` (sans `--apply` : simulation). Une base non marquée est refusée par le CLI Prisma, le seed et `db:migrate-local`. `samahome_dev` et les autres bases existantes ne sont pas marquées : elles sont donc refusées. Le marquage d'une base existante exige une autorisation distincte.

### Scripts neutralisés (contenu conservé pour audit)

Trois scripts sont neutralisés **et commités** : `clean-production-db.mts`, `create-password-reset-table.mts`, `add-permissions-column.mts`. `NEUTRALIZED = true` lève une erreur avant toute connexion.

`purge-test-users.mts` fait l'objet de la même neutralisation, mais **uniquement dans le répertoire de travail, non commitée** à la date de cette révision : la version de HEAD n'est pas neutralisée. Ce script supprime un compte et l'établissement « Touba » avec toutes ses données ; il contient une adresse e-mail codée en dur. Il ne doit pas être exécuté. Il est exclu du lot de gardes des scripts en attendant une décision sur ses adresses.

Retour arrière : retirer le bloc `NEUTRALIZED` du fichier concerné, après relecture et autorisation explicite du propriétaire, et uniquement contre une base de test marquée. **Ne pas utiliser `git checkout -- <fichier>`** pour « réactiver » un script : il restaure la dernière version commitée, qui est la version neutralisée pour les trois scripts commités. Les migrations `20261019100000_add_user_permissions` et `20261019110000_add_password_reset_token` couvrent déjà les deux DDL.

### Classement des scripts par protection

| Protection | Scripts |
|---|---|
| Cible locale **et** marqueur | `prisma/seed.ts`, `__p118-seed-test-data`, `__p187-seed-b`, `test-forgot-password-flow`, `migrate-local`, CLI Prisma ; `bootstrap-platform-admin` en mode local |
| Cible locale **seulement** (pas de marqueur) | `restore-db` (exige en plus une destination **absente**), `prisma/backfill-payments.ts`, `list-all-users`, `inspect-db`, `__p187-inventory`, `mark-test-database` (n'écrit, avec `--apply`, que sur une base vide), `integration-test-bucket` (exige en plus un endpoint S3 local) |
| Cible locale seulement, sans connexion directe à la base | les 19 scripts Playwright `__p*` : la garde porte sur l'environnement, pas sur l'application qu'ils pilotent |
| Gardes propres | `backup-db` (mode local par défaut, ou `--export-production=<hôte>`), `bootstrap-platform-admin` (deux modes), `scripts/deploy/prisma-deploy.config.ts`, `check-production-db.cjs` (session en lecture seule, ne charge pas `.env`) |
| Neutralisés | `clean-production-db`, `create-password-reset-table`, `add-permissions-column` (commités) ; `purge-test-users` (non commité, voir ci-dessus) |
| Gardes **non commitées** | `purge-test-users.mts` (neutralisation et garde dans le répertoire de travail seulement) ; `test-purged-email.mts` : lecture seule (aucune écriture), sa garde `safe-env` n'est pas commitée et il contient des adresses e-mail codées en dur — décision séparée, ne pas l'exécuter contre une base autre que locale |
| Aucune garde (aucune référence à Prisma, `pg` ni `DATABASE_URL`, recherche ciblée ; leurs éventuels accès réseau n'ont pas été examinés) | `render-device-mockups`, `test-image-upload`, `test-object-storage` (faux clients S3, endpoint `*.invalid`), `test-transfer-frequency`, `test-whatsapp-link` |

### Migrer une base de test (chemin local, sur autorisation explicite)

1. `npm run db:mark-test -- samahome_local_v17` (simulation), puis `--apply` si la base est vide.
2. `npm run db:migrate-local` (vérifie cible, marqueur, base attendue ; sans `--apply` rien n'est exécuté), puis `npm run db:migrate-local -- --apply`.
3. Un `npx prisma migrate deploy` direct passe par les mêmes contrôles (garde + marqueur) grâce à `prisma7.config.ts`.
4. Seed (sur autorisation) : `npx prisma db seed`.
5. Tests : `npm test`.

## Chemin de déploiement de production

Voir `DEPLOY.md` : `npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts` (ne lit pas `.env`, exige `SAMA_DEPLOY_TARGET_HOST` = hôte exact de `DATABASE_URL`, refuse toute cible locale) et `npm run backup -- --export-production=<hôte>`.

## Limites connues

- La garde locale prouve que la cible est **locale** ; seul le marqueur indique que la base est **destinée au test**. Il ne prouve pas son contenu : ne jamais restaurer de données de production dans une base marquée.
- Les scripts Playwright pilotent une application lancée à part : elle doit être un `next dev` (qui refuse déjà toute base non locale), jamais un `next start` configuré avec la production. `next dev` vérifie la cible mais pas le marqueur : il ne garantit pas à lui seul que la base utilisée est une base de test marquée.
- Les scripts Playwright ciblent des ports fixes (`localhost:3001`, `3002`, `3005`, `3010`), alors que le script `dev` commité de `package.json` n'impose aucun port. Un changement vers le port 3200 existe seulement dans le répertoire de travail (non commité) : c'est une configuration locale de développement, sans rapport avec la production, et elle ne correspond à aucun des ports ci-dessus. Lancer l'application sur le port attendu par le script voulu.
- `next start` lancé localement avec des identifiants de production n'est pas couvert (indiscernable de l'hébergeur).
- Un script qui ne charge pas la garde reste libre de lire `.env` : `backup-db`, `bootstrap-platform-admin` et `check-production-db.cjs` sont volontairement conservés pour la production, avec leurs protections propres ci-dessus.

## Arrêt immédiat si

L'hôte n'est pas local, une variable manque, la base n'est pas celle attendue, la base n'est pas marquée, un dump de production est détecté, une migration échoue, ou en cas de doute sur la cible.
