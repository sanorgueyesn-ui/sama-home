# Sauvegarde PostgreSQL

## Commande

Deux modes, jamais ambigus :

```bash
# Mode LOCAL (par défaut) — sauvegarde d'une base de développement/test locale
npm run backup

# Export de PRODUCTION — uniquement avec la confirmation explicite de l'hôte
npm run backup -- --export-production=<hôte exact de DATABASE_URL>
```

Équivalents directs : `npx tsx scripts/backup-db.mts` et `npx tsx scripts/backup-db.mts --export-production=<hôte exact>`.

- **Mode local (défaut)** : charge `.env.development.local` par-dessus `.env` et applique la garde de cible locale (`SAMA_ENV=local`, hôte et port locaux autorisés, `SAMA_EXPECTED_DB` égal à la base de `DATABASE_URL` — voir [LOCAL_DEV_ISOLATION.md](./LOCAL_DEV_ISOLATION.md)). Une cible distante est refusée. Les fichiers vont dans `<BACKUP_DIR>/local/` (voir ci-dessous).
- **Export de production** : l'hôte passé à `--export-production=` doit être celui de `DATABASE_URL` ; le script applique alors les règles de cible du déploiement (cible distante, port explicite, aucun paramètre d'URL redirigeant la connexion, `SAMA_ENV` différent de `local`) et refuse une cible locale. Cette confirmation est **fournie en argument** : elle n'équivaut pas à toutes les protections de la procédure de déploiement (`prisma-deploy.config.ts` exige `SAMA_DEPLOY_TARGET_HOST` dans l'environnement et ne lit pas `.env`, alors que `backup-db` charge `.env`). Les fichiers produits contiennent des données réelles et personnelles : support protégé, jamais commités ni partagés.

Lit `DATABASE_URL` depuis l'environnement. Échoue immédiatement et clairement si `DATABASE_URL` est absente — n'invente jamais de valeur par défaut.

## Emplacement et nommage

```
backups/                 # export de production (--export-production)
  daily/samahome_<nom-base>_<horodatage-ISO>.dump
  weekly/samahome_<nom-base>_wk<année-Wsemaine>_<horodatage-ISO>.dump
  monthly/samahome_<nom-base>_mo<année-mois>_<horodatage-ISO>.dump
backups/local/           # mode local (défaut) : même arborescence daily/weekly/monthly
```

Format : `pg_dump -Fc` (format custom PostgreSQL, compressé, restaurable sélectivement par `pg_restore`).

`backups/` est **ignoré par Git** (`.gitignore`) — un backup contient de vraies données, il ne doit jamais se retrouver dans l'historique du dépôt.

L'emplacement est surchargeable via la variable d'environnement `BACKUP_DIR`, pour pointer vers un volume monté ou un autre stockage sécurisé sans modifier le script.

## Rétention

- 7 sauvegardes quotidiennes (`daily/`)
- 4 sauvegardes hebdomadaires (`weekly/`), une promotion par semaine ISO
- 3 sauvegardes mensuelles (`monthly/`), une promotion par mois civil

La rétention ne supprime **jamais** le dernier fichier restant d'un dossier, même si la politique configurée était 0 — filet de sécurité codé en dur dans le script (`pruneRetention`).

## Vérification automatique à chaque exécution

1. Le fichier produit doit exister.
2. Sa taille doit dépasser un seuil minimal plausible (un dump vide/tronqué est rejeté et supprimé).
3. `pg_restore --list` doit pouvoir lire son catalogue sans erreur (preuve structurelle de validité, sans restaurer quoi que ce soit).

Le script ne logue jamais le mot de passe ni l'URL complète de connexion. Pendant la sauvegarde, seul le nom de la base est affiché (hôte masqué) ; en mode local, il affiche en plus l'hôte:port de la cible locale au démarrage.

## Test réel effectué (Bloc P.1) — historique, avant l'introduction des deux modes

Exécuté deux fois de suite contre la vraie base `samahome_dev` :

- 1er run : backup créé (59,8 Ko), intégrité confirmée, promotion weekly + monthly effectuée.
- 2e run (même semaine/mois) : backup créé, **aucune double promotion** weekly/monthly (confirmé en inspectant le contenu réel des dossiers).

## Limites connues

- **Aucun déclenchement automatique** n'existe aujourd'hui (ni cron, ni tâche planifiée) — le script fonctionne, mais rien ne l'exécute périodiquement sans intervention humaine. À configurer chez l'hébergeur retenu.
- Aucun chiffrement au repos du fichier de dump lui-même (dépend du chiffrement du disque/volume sous-jacent, hors périmètre de ce script).
- Aucune copie hors du serveur applicatif (pas de synchronisation vers un stockage distant) — à ajouter si l'hébergeur le permet.

## Responsabilité

Tant qu'aucune tâche planifiée n'est configurée chez l'hébergeur, la sauvegarde reste une action manuelle — documentée ici, pas automatisée en production.
