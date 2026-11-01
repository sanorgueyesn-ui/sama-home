# Documentation production — SAMA HOME

Produite au Bloc P.1, à la suite de l'audit de préparation production (Bloc P, verdict : BLOQUÉ pour une mise en production immédiate — infrastructure d'exploitation manquante, code applicatif déjà validé).

Cette documentation distingue systématiquement :

- **ACTUELLEMENT CONFIGURÉ** — vérifié réellement (commande exécutée, résultat observé), pas supposé.
- **À CONFIGURER CHEZ L'HÉBERGEUR** — dépend d'une plateforme (Railway, Hostinger, ou autre) non accessible depuis l'environnement de développement ; non inventé, non simulé.

## Fichiers

| Fichier | Contenu |
|---|---|
| [BACKUP.md](./BACKUP.md) | Sauvegarde PostgreSQL : script, rétention, test réel effectué |
| [RESTORE.md](./RESTORE.md) | Restauration : procédure, test réel effectué |
| [DEPLOY.md](./DEPLOY.md) | Première installation et déploiements suivants |
| [ROLLBACK.md](./ROLLBACK.md) | Rollback code vs rollback DB — ce qui est possible et ce qui ne l'est pas |
| [INCIDENTS.md](./INCIDENTS.md) | Procédures d'urgence : ce qui existe, ce qui reste à mettre en place |
| [MONITORING.md](./MONITORING.md) | État réel du monitoring (ABSENT) et ce qu'il faudra configurer |
| [BOOTSTRAP_PLATFORM_ADMIN.md](./BOOTSTRAP_PLATFORM_ADMIN.md) | Création du premier administrateur de plateforme : script dédié (`scripts/bootstrap-platform-admin.mts`, jamais encore exécuté) et procédure manuelle alternative |
| [LOCAL_DEV_ISOLATION.md](./LOCAL_DEV_ISOLATION.md) | Isolation du développement local : gardes contre la production, marqueur de base de test, classement des scripts |

## Ce qui est ACTUELLEMENT CONFIGURÉ (code et outils, vérifié dans ce bloc)

- Scripts de sauvegarde/restauration PostgreSQL (`scripts/backup-db.mts`, `scripts/restore-db.mts`), testés réellement contre la base DEV.
- Health check applicatif (`GET /api/health`), vérifie la connectivité DB réelle.
- CI minimale (`.github/workflows/ci.yml`) : `prisma validate` + `lint` + `build` à chaque push/PR — n'exécute jamais de migration, de seed, ni n'accède à une base réelle.
- 27 migrations Prisma dans `prisma/migrations/` (dernière : `20261023120000_add_subscription_change_request`). Les 13 premières ont été testées sur une base vierge (Bloc P) ; les suivantes n'ont été appliquées qu'à des bases locales de test, jamais à la production.
- Gardes contre la production (`src/lib/env-guard.ts`, `prisma7.config.ts`) : toute commande Prisma ou script qui se connecte exige une cible locale et une base marquée « test » ; la production passe uniquement par `prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts` (voir [DEPLOY.md](./DEPLOY.md) et [LOCAL_DEV_ISOLATION.md](./LOCAL_DEV_ISOLATION.md)).
- Tests unitaires : `npm test` (21 fichiers dans `src/lib/__tests__/`). La CI ne les exécute pas.

## Ce qui reste À CONFIGURER CHEZ L'HÉBERGEUR

- Choix définitif de l'hébergeur (Railway anciennement testé mais non vérifiable actuellement depuis cet environnement ; Hostinger prévu mais non configuré — voir [DEPLOY.md](./DEPLOY.md)).
- Exécution planifiée automatique du script de sauvegarde (cron/tâche planifiée côté hébergeur — le script existe et fonctionne, mais rien ne le déclenche automatiquement aujourd'hui).
- Monitoring externe (voir [MONITORING.md](./MONITORING.md)).
- Stockage des sauvegardes hors du serveur applicatif lui-même (ou chiffrement au repos), selon les capacités réelles de l'hébergeur retenu.
- HTTPS, domaine, DNS, reverse proxy, gestionnaire de processus.

Aucune règle métier, aucune permission, aucune page utilisateur n'a été modifiée pour produire cette documentation.
