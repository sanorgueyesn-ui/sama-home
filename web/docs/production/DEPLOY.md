# Déploiement

## État de l'hébergement (ne rien inventer)

- **Railway** : configuré et testé à un moment antérieur du projet (traces dans l'historique Git : « Fix Railway build: generate Prisma Client before next build », « Phase 17.1: Railway readiness »). État **actuel** NON VÉRIFIABLE depuis cet environnement de développement (aucun accès au tableau de bord/CLI Railway).
- **Hostinger** : prévu pour la production finale, **non configuré** à ce jour — aucune trace dans le dépôt (pas de config nginx, Dockerfile, script de déploiement, service systemd).

→ **PRODUCTION HOSTING : À CONFIGURER.** Cette section documente la procédure indépendamment du choix final, en se basant sur ce qui a été vérifié réellement fonctionner (build, démarrage, migrations, backup/restore).

## Variables d'environnement requises

| Variable | Obligatoire | Secret | Où |
|---|---|---|---|
| `DATABASE_URL` | Oui (le serveur refuse de démarrer sans elle) | Oui | `src/lib/prisma.ts` |
| `SESSION_SECRET` | Oui (le serveur refuse de démarrer sans elle) | Oui | `src/lib/session-token.ts` |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Non (seed uniquement, jamais lues par l'application elle-même ; le seed est désormais refusé contre une base distante, voir « Garde contre la production ») | Oui (le mot de passe) | `prisma/seed.ts` |
| `SAMA_DEPLOY_TARGET_HOST` | Oui pour `prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts` et pour `bootstrap-platform-admin --production` (hôte exact de `DATABASE_URL`) | Non | `scripts/deploy/prisma-deploy.config.ts`, `src/lib/env-guard.ts` ; à poser dans l'environnement du processus pour l'opération |
| `SAMA_ENV` | Non en production : ne doit **pas** valoir `local` (un déploiement partant d'un environnement `local` est refusé) | Non | `src/lib/env-guard.ts` ; `local` est réservé à `.env.development.local` |
| `SAMA_EXPECTED_DB` | Non en production (garde de développement local uniquement : nom de la base locale attendue) | Non | `src/lib/env-guard.ts` ; voir [LOCAL_DEV_ISOLATION.md](./LOCAL_DEV_ISOLATION.md) |
| `NODE_ENV` | Géré automatiquement par `next dev`/`next start` | Non | conditionne `secure` sur le cookie de session |
| `BACKUP_DIR` | Non (défaut : `./backups`) | Non | `scripts/backup-db.mts` |

Aucune variable `NEXT_PUBLIC_*` n'existe dans ce projet (confirmé par audit, Bloc N) — rien n'est exposé au navigateur.

## Première installation

```text
1. Provisionner PostgreSQL (16+) chez l'hébergeur retenu
2. Définir DATABASE_URL (connexion directe postgresql://, jamais une URL
   prisma+postgres:///Accelerate — ce projet utilise @prisma/adapter-pg,
   qui exige une connexion TCP directe)
3. Générer et définir SESSION_SECRET :
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
4. npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts
                                (voir « Garde contre la production » ci-dessous ;
                                applique les migrations réelles,
   déterministe, testé avec succès sur une base vierge — Bloc P ; le
   nombre exact doit être revérifié avant chaque déploiement avec
   `find prisma/migrations -maxdepth 1 -type d | grep -v '^prisma/migrations$' | wc -l`
   — jamais `ls prisma/migrations | wc -l` seul, qui compte aussi
   `migration_lock.toml` et surestime le nombre réel de migrations —
   jamais recopié d'un rapport antérieur)
5. npm run build                (prisma generate && next build --webpack)
6. Créer le premier compte SANS le seed : `npx prisma db seed` est refusé
   contre une base distante (voir « Garde contre la production »). La
   procédure dédiée est le bootstrap de l'administrateur de PLATEFORME en
   mode production, avec les prérequis listés ci-dessous (§ « Premier
   compte en production ») et dans BOOTSTRAP_PLATFORM_ADMIN.md ; elle ne
   crée ni établissement ni compte ADMIN d'établissement
7. npm run start                (ou la commande du gestionnaire de
   processus retenu chez l'hébergeur — aucun n'est configuré à ce jour)
8. Vérifier GET /api/health → {"status":"ok"}
9. Smoke tests : login, dashboard, création d'un logement, réservation,
   check-in, paiement, dépense, ouverture caisse, clôture, virement
```

## Déploiements suivants

```text
1. npm run backup -- --export-production=<hôte exact de DATABASE_URL>
                                      (sauvegarde pré-déploiement — voir
                                       BACKUP.md ; ne JAMAIS déployer une
                                       migration sans ce backup, voir
                                       section "Protection avant migration"
                                       ci-dessous)
2. git pull / déploiement du nouveau code
3. npm run build
4. npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts
5. redémarrage du processus Next.js (gestionnaire de processus — à
   configurer chez l'hébergeur)
6. GET /api/health
7. Smoke tests minimum (login + dashboard au minimum)
```

## Protection avant migration (obligatoire)

```text
1. npm run backup -- --export-production=<hôte exact de DATABASE_URL>
                           — échoue bruyamment si DATABASE_URL est absente ou si l'hôte saisi diffère
2. Vérifier la sortie du script (taille du fichier, intégrité confirmée)
3. npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts
4. npx prisma migrate status --config scripts/deploy/prisma-deploy.config.ts
                           — confirmer "Database schema is up to date"
5. GET /api/health
6. Smoke tests
```

## Garde contre la production (phase 0.5)

La configuration Prisma par défaut (`prisma7.config.ts`) refuse toute commande qui ouvre une connexion si la cible n'est pas une base locale ; `NODE_ENV=production` ne la désactive pas. Les migrations de production passent exclusivement par `scripts/deploy/prisma-deploy.config.ts`, appelé avec `--config` :

- il ne lit pas `.env` : `DATABASE_URL` (et `DIRECT_URL`) doivent venir de l'environnement du processus, posé volontairement pour cette opération ;
- `SAMA_DEPLOY_TARGET_HOST` doit valoir l'hôte exact de `DATABASE_URL` (confirmation de la cible) ;
- une cible locale, un paramètre d'URL redirigeant la connexion ou `SAMA_ENV=local` sont refusés.

**À vérifier avant le prochain déploiement :** si l'hébergeur lance `prisma migrate deploy` automatiquement (commande de build, de pré-déploiement ou de démarrage), cette commande doit être remplacée par la forme avec `--config` ci-dessus et la variable `SAMA_DEPLOY_TARGET_HOST` doit y être définie. `package.json` n'en contient aucune (`build` = `prisma generate && next build --webpack`, `start` = `next start`) ; la configuration de l'hébergeur n'a pas pu être vérifiée.

**Sauvegarde de production (`backup-db`) :** `npm run backup` sans option s'exécute en mode **local** (garde de cible locale, fichiers dans `backups/local/`). L'export de la base de production exige `--export-production=<hôte exact de DATABASE_URL>`. Cet hôte est fourni **en argument** et sert de confirmation : le script le traite comme `SAMA_DEPLOY_TARGET_HOST` et applique les mêmes règles de cible que la migration (hôte identique, cible distante, port explicite, aucun paramètre de redirection, `SAMA_ENV` différent de `local`). Ce n'est **pas** équivalent à la garde de migration : la confirmation est tapée avec la commande au lieu d'être posée séparément dans l'environnement, et `backup-db` charge `.env` (`dotenv/config`), contrairement à `prisma-deploy.config.ts`. Voir [BACKUP.md](./BACKUP.md).

**Conséquence pour l'étape 6 ci-dessus :** `npx prisma db seed` est désormais refusé contre une base distante (garde du CLI et du seed).

### Premier compte en production

Procédure dédiée, décidée explicitement, jamais le seed de développement : `scripts/bootstrap-platform-admin.mts` en mode production (détails et limites dans [BOOTSTRAP_PLATFORM_ADMIN.md](./BOOTSTRAP_PLATFORM_ADMIN.md)). Prérequis, vérifiés dans le code avant toute connexion à la base :

- `--production` (sans lui, le script s'exécute en mode local et refuse une cible distante) ;
- `SAMA_DEPLOY_TARGET_HOST` dans l'environnement du processus, égal à l'hôte exact de `DATABASE_URL` ;
- `--target-host=<même hôte>` en argument (le drapeau seul n'autorise jamais une cible distante) ;
- `BOOTSTRAP_PLATFORM_ADMIN_USERNAME`, `_PASSWORD` et `_NAME` définis, l'identifiant étant différent de `SEED_ADMIN_USERNAME` ;
- pour créer réellement le compte : `--write` **et** `BOOTSTRAP_PLATFORM_ADMIN_CONFIRM` valant exactement `BOOTSTRAP_PLATFORM_ADMIN_USERNAME` ; sans `--write`, le script ne fait qu'une vérification sans écriture.

Le script charge `dotenv/config` (donc `.env`) comme avant, sans jamais charger `.env.development.local` dans ce mode ; pour la production, poser ces variables dans l'environnement du processus. Le compte créé est un administrateur de plateforme (`isPlatformAdmin`, sans `role` ni `establishmentId`) ; un compte existant n'est jamais modifié ni promu.

Ne jamais exécuter `prisma migrate deploy` en production sans qu'un backup frais (étape 1) ait réussi. Ce projet n'a pas aujourd'hui de mécanisme qui bloque automatiquement une migration si le backup échoue — c'est une discipline opérationnelle à respecter manuellement tant qu'aucune automatisation CI/CD de déploiement n'existe.

## Ce qui N'EST PAS encore défini

- Gestionnaire de processus (pm2, systemd, ou natif à l'hébergeur) : **à configurer chez l'hébergeur**.
- Déclenchement automatique de la sauvegarde de production (`npm run backup -- --export-production=<hôte exact>`) avant chaque déploiement : **à configurer**.
- Pipeline de déploiement automatisé (la CI actuelle valide le code, elle ne déploie rien) : **à configurer**.
