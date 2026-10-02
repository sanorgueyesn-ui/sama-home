# Procédures d'incident

Chaque section distingue ce qui **EXISTE ACTUELLEMENT** (vérifié, pas supposé) de ce qui reste **À METTRE EN PLACE**.

## DB indisponible

**Existe actuellement** : `GET /api/health` détecte réellement une base inaccessible (exécute `SELECT 1`, renvoie `{"status":"error"}` avec un code 503 si la requête échoue — jamais le mot de passe ni l'URL de connexion dans la réponse).

Procédure :
1. Constater via le health check (ou une alerte externe — à mettre en place, voir MONITORING.md).
2. Vérifier que PostgreSQL est bien démarré côté hébergeur.
3. Vérifier les logs du processus Next.js pour l'erreur de connexion exacte.
4. Vérifier que `DATABASE_URL` n'a pas changé (rotation de secret, changement d'hôte).
5. Ne restaurer un backup **que si** les données elles-mêmes sont en cause — une DB simplement arrêtée/redémarrée ne nécessite aucune restauration.

**À mettre en place** : alerte automatique sur l'échec du health check (aujourd'hui, rien ne notifie personne — il faut consulter la route manuellement ou via un moniteur externe à configurer).

## Déploiement cassé

**Existe actuellement** : CI minimale (`.github/workflows/ci.yml`) qui valide schéma/lint/build sur chaque push — réduit le risque de pousser du code cassé, sans l'éliminer (pas de déploiement automatisé, pas de tests end-to-end en CI).

Procédure :
1. Arrêter/ne pas promouvoir la nouvelle version si un déploiement progressif est possible chez l'hébergeur (non configuré aujourd'hui — déploiement actuel = tout ou rien).
2. Consulter les logs du processus pour l'erreur exacte.
3. Rollback code vers la dernière version fonctionnelle connue (voir ROLLBACK.md).
4. Vérifier `npx prisma migrate status` — si une migration de la version cassée a déjà été appliquée, le rollback code seul peut ne pas suffire (voir ROLLBACK.md, Cas A).
5. Restaurer la DB uniquement si le schéma lui-même est en cause, pas pour un simple bug applicatif.

**À mettre en place** : déploiement progressif/bleu-vert, rollback automatisé.

## Mauvaise migration

**Existe actuellement** : procédure décrite (ROLLBACK.md, Cas B), backup obligatoire avant toute migration documenté (DEPLOY.md).

Procédure :
1. Arrêter toute nouvelle opération d'écriture si possible.
2. Conserver les logs de l'erreur de migration (ne rien effacer).
3. Identifier précisément la migration en cause (`npx prisma migrate status`).
4. Si un backup pré-migration existe (il doit exister — c'est l'étape obligatoire précédente), le conserver intact.
5. Restaurer ce backup pré-migration si l'état de la base est incertain ou incohérent.
6. Vérifier l'intégrité après restauration (comptages de lignes, contraintes — voir RESTORE.md) avant de rouvrir l'accès.

**À mettre en place** : aucune automatisation n'existe pour détecter qu'une migration a échoué autrement qu'en consultant manuellement les logs/`migrate status`.

## Secret compromis (`SESSION_SECRET` ou `DATABASE_URL`)

Procédure :
1. Générer et déployer immédiatement une nouvelle valeur (`SESSION_SECRET` : commande fournie dans DEPLOY.md ; `DATABASE_URL` : faire tourner le mot de passe PostgreSQL côté hébergeur).
2. Redéployer l'application avec la nouvelle valeur.
3. **Invalider toutes les sessions existantes** : changer `SESSION_SECRET` invalide automatiquement tous les cookies de session déjà émis (la vérification de signature JWT échouera pour tous — confirmé par le mécanisme déjà audité, Bloc N) ; aucune action manuelle supplémentaire n'est nécessaire pour ce point précis.
4. Vérifier les logs pour toute activité suspecte antérieure à la rotation.

**À mettre en place** : aucune détection automatique de fuite de secret n'existe (pas de scan de secrets en CI à ce jour, bien que la CI du Bloc P.1 ne manipule elle-même aucun secret réel).

## Suppression accidentelle de données

**Existe actuellement** : protection structurelle forte au niveau base de données — la quasi-totalité des relations utilisent `onDelete: Restrict` (confirmé exhaustivement, Bloc M), ce qui bloque la plupart des suppressions qui casseraient l'historique financier/opérationnel. Une seule exception connue (`RentalExtension.rentalId` en `Cascade`, sans impact pratique puisqu'aucune action de suppression physique de `Rental` n'existe dans le code — Bloc M).

Procédure en cas de suppression malgré tout :
1. Ne rien écrire de plus dans la base.
2. Restaurer le dernier backup valide antérieur à la suppression.
3. Vérifier l'intégrité (RESTORE.md).

**À mettre en place** : rien de spécifique au-delà des protections structurelles déjà en place et du backup/restore désormais fonctionnel.

## Perte de fichiers

**Sans objet** — aucune infrastructure de fichiers/photos n'existe dans ce projet (`Property.photo` est une simple URL collée, confirmé Bloc P). Aucune procédure nécessaire pour la V1 actuelle.

## Disque plein

**À mettre en place** — aucune politique de rétention de logs/backups au-delà de la rétention des backups elle-même (7 quotidiens / 4 hebdomadaires / 3 mensuels, voir BACKUP.md) n'existe. Dépend de la surveillance disque de l'hébergeur (voir MONITORING.md).
