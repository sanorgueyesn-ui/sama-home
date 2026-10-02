# Rollback

> **Rollback applicatif ≠ rollback DB.** Les deux doivent être pensés séparément — revenir à une ancienne version du code ne défait pas une migration déjà appliquée, et inversement.

## Rollback code

Le dépôt a un remote GitHub réel (`origin`), une seule branche (`master`). Rollback possible via Git standard :

```bash
git log --oneline          # identifier le commit à restaurer
git revert <commit>        # préféré : crée un nouveau commit, ne réécrit pas l'historique
# ou, en dernier recours, après avoir confirmé avec l'opérateur :
git checkout <commit> -- . && git commit
```

**Attention identifiée au Bloc P** : au moment de l'audit, 41 fichiers de travail validé n'étaient pas encore commités. Un rollback Git (`git reset --hard`, `git checkout .`) exécuté sans vérification aurait perdu ce travail. Toujours exécuter `git status`/`git diff --stat` avant tout rollback et confirmer qu'aucun travail non commité n'est en jeu.

## Rollback DB

**Prisma n'a pas de mécanisme de rollback automatique** (`prisma migrate deploy` n'applique que dans un sens, aucune migration "down" n'est générée — confirmé par la documentation Prisma elle-même, rien n'est inventé ici). Les seules options réelles :

### Cas A — migration réussie, mais l'application ne fonctionne plus comme attendu

1. Rollback du code (section précédente) vers la version compatible avec le schéma actuel.
2. Si le code revenu en arrière n'est PAS compatible avec le nouveau schéma (colonne/table manquante pour l'ancien code), restaurer le backup pré-migration (voir RESTORE.md) plutôt que de faire cohabiter un ancien code avec un nouveau schéma.

### Cas B — la migration elle-même échoue en cours d'application

1. Ne rien exécuter d'autre immédiatement.
2. `npx prisma migrate status` pour connaître l'état exact (migration appliquée partiellement ? marquée en échec ?).
3. Consulter les logs du processus pour l'erreur SQL exacte.
4. Ne jamais relancer `migrate deploy` à l'aveugle sur un état incertain — restaurer le backup pré-migration (créé obligatoirement avant toute migration, voir DEPLOY.md section "Protection avant migration") puis diagnostiquer la migration en échec sur une base de test avant de retenter.

### Cas C — données corrompues après la migration (logique applicative, pas le schéma lui-même)

1. Restaurer le dernier backup valide **antérieur** à l'incident (pas nécessairement le tout dernier backup, s'il contient déjà la corruption).
2. Après restauration, réappliquer uniquement les migrations de schéma nécessaires (`migrate deploy`) si le backup restauré est plus ancien que la dernière migration légitime.
3. Documenter l'incident (voir INCIDENTS.md) avant de rouvrir l'accès aux utilisateurs.

## Limites à accepter

- Aucun test automatisé de rollback DB n'existe (seule la restauration complète d'un backup a été testée réellement — Bloc P et P.1 — pas un rollback partiel/sélectif d'une seule migration).
- Toute restauration perd les données écrites entre l'instant du backup restauré et l'incident (c'est la définition même du RPO — voir README.md/section RPO-RTO dans le rapport du Bloc P.1).
