# Restauration PostgreSQL

## Commande

```bash
npx tsx scripts/restore-db.mts <chemin-du-dump> <nom-base-destination>
```

## Garde-fous intégrés

- **Refuse de restaurer vers la base identifiée par `DATABASE_URL`** — la destination doit être un nom de base explicite et différent, fourni en argument. Testé réellement (Bloc P.1) : tentative de restauration vers `samahome_dev` alors que `DATABASE_URL` pointe sur cette même base → rejetée avec un message clair, code de sortie non nul.
- Vérifie l'intégrité du dump (`pg_restore --list`) avant toute tentative de restauration.
- **Exige une cible locale** : `scripts/lib/safe-env.mts` applique d'abord la garde de développement (`SAMA_ENV=local`, hôte et port locaux autorisés, `SAMA_EXPECTED_DB` égal à la base de `DATABASE_URL` — voir [LOCAL_DEV_ISOLATION.md](./LOCAL_DEV_ISOLATION.md)). L'hôte, le port et l'utilisateur de la restauration sont ceux de `DATABASE_URL`.
- **La destination doit être ABSENTE** : le script crée la base de destination (`CREATE DATABASE`). Si une base de ce nom existe déjà (y compris `postgres`, `template0`, `template1`, ou une base de test déjà marquée), il s'arrête **avant** toute restauration, sans rien restaurer, supprimer ni modifier.
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

Le script ne supprime, ne vide ni ne recrée jamais une base existante. Si le nom choisi est déjà pris, choisir un autre nom.

Si `pg_restore` échoue après la création de la base de destination, cette base peut rester présente mais incomplète ; une nouvelle tentative avec le même nom sera alors refusée (destination existante). Choisir un autre nom, ou décider volontairement de supprimer la base incomplète (voir « Ce qui est dangereux / irréversible »).

## Ce qui est dangereux / irréversible

- Ce script restaure toujours vers une base **neuve** (absente avant l'exécution), jamais vers la base de `DATABASE_URL` ni vers une base existante. Il ne faut pas contourner ce refus en restaurant manuellement avec `pg_restore` dans une base peuplée : cela fusionne ou écrase du contenu selon les options.
- **Opération manuelle distincte, volontaire et dangereuse** : si une destination existante doit être remplacée, la supprimer (`dropdb <nom>`) est une décision de l'opérateur, hors de ce script. Elle détruit définitivement la base ; ne l'envisager qu'après avoir vérifié le nom exact, s'être assuré qu'il ne s'agit ni de la base de `DATABASE_URL`, ni d'une base d'un autre projet de la même instance, et disposer d'une sauvegarde valide si le contenu importe.
- Une fois une base de test supprimée (`dropdb`), son contenu est définitivement perdu — s'assurer que la vérification est terminée avant de la supprimer.
- Une base restaurée n'est **pas** marquée comme base de test : les outils qui exigent le marqueur la refusent (comportement voulu). Ne jamais restaurer de données de production dans une base marquée.

## Test réel effectué (Bloc P.1 et Bloc P) — historique, avant la garde de cible locale et le refus d'une destination existante

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
