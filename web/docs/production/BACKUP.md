# Sauvegarde PostgreSQL

## Commande

```bash
npm run backup
```

Équivalent direct : `npx tsx scripts/backup-db.mts`.

Lit `DATABASE_URL` depuis l'environnement (`.env` en local via `dotenv/config`, ou une variable d'environnement réelle en production). Échoue immédiatement et clairement si `DATABASE_URL` est absente — n'invente jamais de valeur par défaut.

## Emplacement et nommage

```
backups/
  daily/samahome_<nom-base>_<horodatage-ISO>.dump
  weekly/samahome_<nom-base>_wk<année-Wsemaine>_<horodatage-ISO>.dump
  monthly/samahome_<nom-base>_mo<année-mois>_<horodatage-ISO>.dump
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

Le script ne logue jamais le mot de passe ni l'URL complète de connexion — uniquement le nom de la base (jamais l'hôte/l'identifiant).

## Test réel effectué (Bloc P.1)

Exécuté deux fois de suite contre la vraie base `samahome_dev` :

- 1er run : backup créé (59,8 Ko), intégrité confirmée, promotion weekly + monthly effectuée.
- 2e run (même semaine/mois) : backup créé, **aucune double promotion** weekly/monthly (confirmé en inspectant le contenu réel des dossiers).

## Limites connues

- **Aucun déclenchement automatique** n'existe aujourd'hui (ni cron, ni tâche planifiée) — le script fonctionne, mais rien ne l'exécute périodiquement sans intervention humaine. À configurer chez l'hébergeur retenu.
- Aucun chiffrement au repos du fichier de dump lui-même (dépend du chiffrement du disque/volume sous-jacent, hors périmètre de ce script).
- Aucune copie hors du serveur applicatif (pas de synchronisation vers un stockage distant) — à ajouter si l'hébergeur le permet.

## Responsabilité

Tant qu'aucune tâche planifiée n'est configurée chez l'hébergeur, la sauvegarde reste une action manuelle — documentée ici, pas automatisée en production.
