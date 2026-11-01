# SAMA HOME — Application web

SaaS multi-établissements (multi-tenant) de gestion de résidences meublées, hôtels, auberges et appartements au Sénégal : logements et tarifs, réservations, séjours/locations, clients, caisse, banque, dépenses, contrats PDF, abonnements et administration de la plateforme. Interface en français, montants en FCFA.

> Avant de modifier le projet, lire `../AGENTS.md` (règles de sécurité et de développement), `AGENTS.md` (spécificités de cette version de Next.js) et `../AGENT_HANDOFF.md` (état courant et opérations interdites).

## Stack

| Élément | Version / détail |
|---|---|
| Framework | Next.js 16 (App Router, build `--webpack`) |
| UI | React 19, Tailwind CSS 4, TypeScript 5 |
| Données | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Validation | zod 4 |
| Auth | Sessions en base + cookie signé, bcryptjs, OTP e-mail |
| PDF | `@react-pdf/renderer` |
| Fichiers | S3 compatible (`@aws-sdk/client-s3`) |
| E-mails | Relais HTTPS (prioritaire) puis SMTP (Nodemailer) |
| Prérequis | Node.js ≥ 22.12 |

## Démarrage local

1. Installer les dépendances : `npm ci`.
2. Copier `.env.example` vers `.env.development.local` et renseigner une **base PostgreSQL locale de test** (voir `docs/production/LOCAL_DEV_ISOLATION.md`). Ne jamais pointer un outil de développement vers la base de production ; ne jamais committer un fichier `.env*` (hors `.env.example`).
3. Marquer la base de test : `npm run db:mark-test`, puis appliquer les migrations : `npm run db:migrate-local`.
4. Lancer le serveur : `npm run dev` (port 3200 dans le script actuel).

Les commandes Prisma qui se connectent à une base sont bloquées par une garde (`prisma7.config.ts`, `src/lib/env-guard.ts`) tant que la cible n'est pas locale et marquée comme base de test.

## Scripts npm

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | `prisma generate` puis `next build --webpack` |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (`src/lib/__tests__/*.test.mts`, `node:test` via `tsx`) |
| `npm run backup` / `npm run restore` | Sauvegarde / restauration PostgreSQL (voir `docs/production/`) |
| `npm run bootstrap:platform-admin` | Création du premier administrateur de plateforme |
| `npm run db:mark-test` / `npm run db:migrate-local` | Marquage et migration de la base locale de test |
| `npm run test:transfer-frequency`, `test:whatsapp-link`, `test:image-upload`, `test:object-storage` | Scripts de vérification ciblés |

Sous Windows, arrêter les processus Node orphelins avant `prisma generate` ou `build` (erreurs `EPERM`/`EBUSY`).

## Structure

```
src/app/            Routes (App Router) : dashboard, logements, reservations, locations, sejour,
                    clients, caisse, depenses, settings, abonnement, plateforme, login, register,
                    forgot-password, landing, api/health, api/auth
src/app/actions/    Server Actions (auth, abonnements, demandes de changement d'abonnement, caisse, ...)
src/lib/            Accès aux données (DAL), permissions, sessions, OTP, mail, stockage objet, gardes
src/proxy.ts        Proxy (équivalent middleware)
prisma/             schema.prisma et migrations (27)
scripts/            Exploitation (backup, restore, bootstrap) et scripts de test historiques
docs/production/    Documentation d'exploitation (déploiement, sauvegarde, restauration, incidents...)
```

## Sécurité (résumé)

- Le `establishmentId` provient toujours de la session serveur, jamais du client ; chaque requête métier filtre par établissement.
- Administrateur d'établissement (`role === "ADMIN"`) et administrateur de plateforme (`isPlatformAdmin`) sont deux notions distinctes (`requireAdmin()` / `requirePlatformAdmin()` dans `src/lib/dal.ts`).
- Limitation de débit sur la connexion, le mot de passe oublié et l'OTP ; sessions révocables en base.
- Aucun secret dans le code ni dans `NEXT_PUBLIC_*`.

## Documentation d'exploitation

Voir [docs/production/README.md](./docs/production/README.md) : déploiement, sauvegarde, restauration, rollback, incidents, supervision, création du premier administrateur de plateforme, isolation du développement local.

## CI

`.github/workflows/ci.yml` exécute `npm ci`, `prisma validate`, le lint et le build avec des valeurs factices. Elle n'exécute ni les tests (`npm test`) ni aucune migration.
