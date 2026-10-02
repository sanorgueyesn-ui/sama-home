# Restauration PostgreSQL

## Commande

```bash
npx tsx scripts/restore-db.mts <chemin-du-dump> <nom-base-destination>
```

## Garde-fous intégrés

- **Refuse de restaurer vers la base identifiée par `DATABASE_URL`** — la destination doit être un nom de base explicite et différent, fourni en argument. Testé réellement (Bloc P.1) : tentative de restauration vers `samahome_dev` alors que `DATABASE_URL` pointe sur cette même base → rejetée avec un message clair, code de sortie non nul.
- Vérifie l'intégrité du dump (`pg_restore --list`) avant toute tentative de restauration.
- Crée la base de destination si elle n'existe pas encore (`CREATE DATABASE`), ou restaure dans une base existante si elle existe déjà.
- Affiche un résumé du nombre de lignes par table après restauration, pour une vérification immédiate.
- N'affiche jamais le mot de passe.

## Procédure complète

```text
1. Choisir un dump (backups/daily|weekly|monthly/*.dump)
2. npx tsx scripts/restore-db.mts <dump> <nom-base-temporaire>
3. Vérifier le résumé des lignes affiché par le script
4. (si vérification applicative nécessaire) démarrer SAMA HOME avec
   DATABASE_URL pointant sur cette base temporaire, sur un port différent
   de l'instance en cours d'utilisation
5. Vérifier /api/health, se connecter, consulter dashboard/réservations/
   locations/caisse/virements
6. Supprimer la base temporaire une fois la vérification terminée :
   dropdb <nom-base-temporaire>
```

Ce qui est **automatisé** : création de la base, restauration, vérification d'intégrité, résumé des comptes de lignes.
Ce qui reste **manuel** : le choix du dump à restaurer, le démarrage éventuel de l'application contre la base restaurée, la suppression de la base temporaire après usage.

## Ce qui est dangereux / irréversible

- `pg_restore` sur une base **déjà peuplée** écrase/fusionne son contenu selon les options — ce script restaure toujours vers une base **neuve ou explicitement choisie**, jamais vers la base de production en cours d'utilisation (garde-fou ci-dessus).
- Une fois une base de test supprimée (`dropdb`), son contenu est définitivement perdu — s'assurer que la vérification est terminée avant de la supprimer.

## Test réel effectué (Bloc P.1 et Bloc P)

Cycle complet exécuté avec succès à deux reprises dans cette session (Bloc P avec des commandes manuelles, Bloc P.1 avec le script réutilisable) :

```
samahome_dev (réelle)
  → pg_dump (script backup-db.mts)
  → nouvelle base de test (script restore-db.mts, création automatique)
  → pg_restore
  → comptage de lignes sur 20 tables, identique à la source
  → application réelle démarrée (next start) contre cette base restaurée
  → login réel + accès à /, /reservations, /locations, /caisse,
    /caisse/virements, /settings : tous 200
  → base de test supprimée
```

Durées mesurées sur le volume actuel de DEV (non représentatif d'un volume de production) : sauvegarde ≈ 370-400ms, restauration ≈ 410-480ms.
