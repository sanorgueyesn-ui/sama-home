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
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Non (seed uniquement, jamais lues par l'application elle-même) | Oui (le mot de passe) | `prisma/seed.ts` |
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
4. npx prisma migrate deploy   (applique les 21 migrations réelles,
   déterministe, testé avec succès sur une base vierge — Bloc P ; le
   nombre exact doit être revérifié avant chaque déploiement avec
   `find prisma/migrations -maxdepth 1 -type d | grep -v '^prisma/migrations$' | wc -l`
   — jamais `ls prisma/migrations | wc -l` seul, qui compte aussi
   `migration_lock.toml` et surestime le nombre réel de migrations —
   jamais recopié d'un rapport antérieur)
5. npm run build                (prisma generate && next build)
6. Définir SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME
   puis : npx prisma db seed    (crée le premier ADMIN, idempotent —
   n'écrase jamais un compte existant, Bloc M)
7. npm run start                (ou la commande du gestionnaire de
   processus retenu chez l'hébergeur — aucun n'est configuré à ce jour)
8. Vérifier GET /api/health → {"status":"ok"}
9. Smoke tests : login, dashboard, création d'un logement, réservation,
   check-in, paiement, dépense, ouverture caisse, clôture, virement
```

## Déploiements suivants

```text
1. npm run backup                    (sauvegarde pré-déploiement — voir
                                       BACKUP.md ; ne JAMAIS déployer une
                                       migration sans ce backup, voir
                                       section "Protection avant migration"
                                       ci-dessous)
2. git pull / déploiement du nouveau code
3. npm run build
4. npx prisma migrate deploy
5. redémarrage du processus Next.js (gestionnaire de processus — à
   configurer chez l'hébergeur)
6. GET /api/health
7. Smoke tests minimum (login + dashboard au minimum)
```

## Protection avant migration (obligatoire)

```text
1. npm run backup          — échoue bruyamment si DATABASE_URL est absente
2. Vérifier la sortie du script (taille du fichier, intégrité confirmée)
3. npx prisma migrate deploy
4. npx prisma migrate status   — confirmer "Database schema is up to date"
5. GET /api/health
6. Smoke tests
```

Ne jamais exécuter `prisma migrate deploy` en production sans qu'un backup frais (étape 1) ait réussi. Ce projet n'a pas aujourd'hui de mécanisme qui bloque automatiquement une migration si le backup échoue — c'est une discipline opérationnelle à respecter manuellement tant qu'aucune automatisation CI/CD de déploiement n'existe.

## Ce qui N'EST PAS encore défini

- Gestionnaire de processus (pm2, systemd, ou natif à l'hébergeur) : **à configurer chez l'hébergeur**.
- Déclenchement automatique de `npm run backup` avant chaque déploiement : **à configurer**.
- Pipeline de déploiement automatisé (la CI actuelle valide le code, elle ne déploie rien) : **à configurer**.
