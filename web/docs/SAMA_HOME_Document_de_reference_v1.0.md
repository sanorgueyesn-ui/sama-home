# SAMA HOME — Document de référence v1.0

**Date : 22 octobre 2026**  
**Statut : document de conception consolidé.** Ce document rassemble les règles discutées, les orientations proposées et les décisions ouvertes. Il ne constitue ni un audit technique exécuté, ni une garantie de conformité légale, ni une autorisation de déployer.

## 1. Gouvernance
- Aucune modification du code, de la base de données, de la configuration de production ou aucun déploiement sans autorisation explicite.
- Avant toute intervention, vérifier le dépôt, la branche, les modifications locales, les versions, l'environnement et l'état des services. Ne jamais deviner.
- Préserver le travail existant ; éviter les audits/tests/prompts répétés sans nécessité.
- Distinguer règle validée, proposition, objectif à mesurer, décision ouverte et résultat effectivement vérifié.
- Une compilation réussie ne suffit pas pour autoriser une mise en production.
- Chaque changement significatif précise objectif, périmètre, risques, tests, récupération, validations et traçabilité.

## 2. Sécurité et accès
- Chaque lecture/écriture/API/action serveur/document/PDF/export/fichier vérifie côté serveur le périmètre de l'établissement.
- Modifier un identifiant ne doit pas donner accès à un autre établissement.
- MFA obligatoire pour les administrateurs de plateforme ; les autres comptes selon les méthodes prises en charge.
- Valeurs proposées à confirmer dans le code : 30 minutes d'inactivité, 12 heures de durée maximale de session ; réauthentification pour actions sensibles.
- Après cinq échecs consécutifs, limitation temporaire progressive sans révéler l'existence d'un compte.
- Comptes individuels, moindre privilège, révocation lors d'un départ ou changement de rôle.
- Accès production justifié, autorisé, limité dans le temps et audité.
- Accès exceptionnel aux données privées : motif, durée limitée, moindre privilège, audit ; seconde approbation indépendante pour les accès sensibles.
- Administrateur principal et rôles secondaires séparés ; aucun auto-accroissement de privilèges. Prévoir un remplaçant limité et audité.

## 3. Journaux, audit et secrets
- Journaliser pour les actions sensibles : acteur, rôle, action, objet, date, contexte établissement, résultat et motif si nécessaire.
- Jamais de mots de passe, jetons, clés, secrets ou données personnelles inutiles dans les journaux.
- Journaux non modifiables par les utilisateurs ordinaires ; accès aux journaux lui-même traçable.
- Protéger contre l'altération, contrôler l'intégrité et sauvegarder.
- Rétention par catégorie, revue annuelle et vérification au regard du droit sénégalais ; cinq ans n'est pas une décision finale.
- Secrets dans un gestionnaire sécurisé ou variables d'environnement protégées ; jamais dans le code ni les logs ; séparer dev/test/prod.

## 4. Données personnelles, exports et suppression
- Classification : public, interne, confidentiel (coordonnées/contrats/finances), très sensible (pièces d'identité/secrets).
- Expliquer données collectées, finalités, accès, conservation, prestataires/transferts et droits.
- Minimiser les données et tracer les accès aux données très sensibles.
- Traiter les demandes de droits avec vérification, ticket, statut, responsable, date et réponse dans les délais légaux.
- Exports autorisés : biens, chambres, tarifs, clients, réservations, locations, paramètres, finances/historiques et fichiers. CSV/Excel, PDF et ZIP avec manifeste.
- Exclure secrets ; contrôler permissions, liens temporaires, intégrité, audit et nettoyage des archives temporaires. Disponibilité du lien 24 h = objectif proposé à vérifier.
- Avant suppression : vérifier identité/autorité, possibilité d'export, obligations légales/financières, copies DB/sauvegardes/S3, approbation indépendante et confirmation finale.
- Période de fermeture contrôlée de 30 jours = proposition à confirmer. Ne pas supprimer les données nécessaires à une obligation, un litige ou une opération financière.
- Ne jamais reconstruire des données manquantes par supposition.

## 5. Paiements et remboursements
- Paiement en attente/échoué n'active pas un abonnement. Activation automatique uniquement après confirmation réelle du fournisseur.
- Paiements manuels : vérifier la réception réelle ; capture ou déclaration du client insuffisante.
- Identifiant unique, détection des doublons et vérification fournisseur avant de réessayer une opération incertaine.
- Geler montant, devise, période et conditions de la demande de paiement.
- Demandeur d'un paiement manuel ne peut pas l'approuver seul.
- Remboursement justifié, lié à la transaction d'origine, validé par une personne distincte ; plafonné au solde remboursable ; remboursements partiels possibles.
- Une demande en attente n'est pas présentée comme terminée ; historique immuable.
- Seuil FCFA pour double validation des remboursements élevés à définir.
- Après panne, rapprocher avec fournisseur/logs/preuves fiables ; les opérations non résolues restent en vérification manuelle.

## 6. Abonnements et suspensions
- Prix et limites proposés ne sont pas définitifs. Ne pas les publier sans décision explicite.
- Ne pas vendre Hôtel/Agence avant que les modules soient construits et testés.
- Respecter périodes, proratas, dates et conditions affichées ; prévenir les doubles prolongations et les changements de prix rétroactifs.
- À l'expiration, bloquer les opérations commerciales concernées mais conserver les données et l'accès à la page d'abonnement.
- Distinguer annulation du renouvellement, remboursement, fermeture, suspension de sécurité et résiliation.
- Toute suspension a motif, responsable, revue, notification appropriée et possibilité de contestation. Délais proposés (accusé sous 1 jour ouvrable, réponse sous 5) non garantis.
- Préserver les conditions des établissements historiques/testeurs fondateurs sans conversion automatique payante.

## 7. Sauvegardes et récupération
- Cible proposée : sauvegarde quotidienne, rétention 30 jours, à confirmer.
- Copie indépendante nécessaire ; versionnage S3 seul insuffisant.
- Accès restreints, séparation des droits de suppression, copies isolées/immutables si disponibles, contrôles d'intégrité.
- Après restauration : vérifier relations DB, objets S3, finances, authentification et isolation multi-tenant.
- RPO 15 minutes et RTO 4 heures = objectifs proposés, non garantis avant exercices.
- Tests trimestriels de restauration en environnement isolé, sans transactions ni notifications réelles. Échec = incident prioritaire, responsable, plan correctif, nouveau test.
- Exercice annuel isolé de migration vers un autre hébergeur.
- Pas de reprise en production sans contrôles documentés et autorisation explicite.

## 8. Continuité et mode dégradé
Ordre validé :
1. Sécurité, intégrité des données et prévention des doublons.
2. Réservations, locations en cours, disponibilité et opérations financières fiables.
3. Gestion courante et documents nécessaires.
4. Rapports, statistiques et tâches pouvant attendre.
- Panne PostgreSQL : suspendre les écritures non confirmables.
- Panne S3 : désactiver les fonctions dépendantes qui ne peuvent fonctionner sûrement.
- Paiement incertain : vérifier auprès du fournisseur avant nouvel essai.
- Ne pas présenter les données périmées comme actuelles.
- Bloquer les opérations risquées jusqu'à vérification ; reprise progressive et journalisée.
- Informer sur l'état connu et les fonctions touchées ; jamais annoncer un succès non confirmé.

## 9. Incidents et communication
Objectifs internes de première réponse :
- P1 critique : 15 minutes.
- P2 élevé : 1 heure.
- P3 modéré : 1 jour ouvrable.
- P4 faible : 5 jours ouvrables.
Ces délais sont des objectifs, pas des garanties.
- Processus : détecter/qualifier, contenir, corriger/restaurer, vérifier avant reprise, documenter.
- Incident important non clôturé tant que les vérifications requises ne sont pas terminées.
- Erreurs importantes : identifiant, date, fonction, type, responsable, statut ; détails techniques limités aux personnes autorisées.
- Dédupliquer les alertes sans perdre l'historique ; accusé de réception, escalade, canal de secours et contrôle du système d'alertes.
- Toute suspicion de violation de données déclenche évaluation formelle, préservation des preuves et décision documentée sur notifications légales.
- Notifications app/email/WhatsApp uniquement si intégrations, coûts, permissions et préférences/consentements sont pris en charge.
- Incident critique : analyse de cause, action corrective suivie et test d'efficacité.

## 10. Tests et déploiement
- Tester changements et parcours essentiels : réservations, locations, finances, permissions et données historiques.
- Non-régression : chevauchements, prolongations, départs, montants, acomptes, paiements, remboursements, doublons et isolation.
- Tester migrations sur copie isolée.
- Checklist préproduction : fonctionnalités, sécurité, permissions, migrations, sauvegardes, finances, performance, compatibilité, monitoring et retour arrière.
- Échec critique bloque la livraison.
- Surveillance renforcée pendant 24 h après déploiement.
- Retour arrière tenant compte des migrations et opérations effectuées ; jamais annuler une migration à l'aveugle.
- Dépendances : inventaire, veille vulnérabilités, tests isolés ; priorité aux vulnérabilités critiques ; pas de mise à jour automatique non contrôlée en production.

## 11. Disponibilité, hébergement et coûts
- Disponibilité essentielle visée : 99,5 % par mois, à mesurer avec contrôle externe et parcours métier. Équivalent théorique sur 30 jours : environ 3 h 36 min d'indisponibilité.
- Objectifs de performance à définir et mesurer.
- Surveiller app, PostgreSQL, S3, ressources, connexions DB, paiements, notifications, stockage/transferts et factures.
- Définir budget mensuel, seuils d'alerte et prévisions selon établissements, utilisateurs, réservations, fichiers et notifications.
- Ne pas arrêter automatiquement les fonctions essentielles ou supprimer des sauvegardes sans évaluation et autorisation.
- Suivre renouvellements hébergement/domaine/TLS ; protéger registrar/DNS avec MFA, récupération protégée et alertes.
- Préparer migration d'urgence : code, DB, S3, secrets, intégrations, domaine/TLS, tests, prévention du split-brain et retour arrière.
- Alertes : avertissement (dégradation), majeur (fonction essentielle indisponible), critique (perte/corruption, sécurité majeure, panne générale).

## 12. Chiffrement et clés
- Chiffrement en transit et au repos selon capacités du fournisseur pour DB, S3, sauvegardes et exports.
- Séparer clés et données chiffrées ; accès minimal.
- Cycle de vie des clés : générer, stocker, utiliser, tourner, révoquer, archiver si nécessaire, détruire après contrôle des dépendances et obligations.
- Procédure de récupération sûre ; protection des DNS/TLS et alertes sur expirations/changements.

## 13. Décisions ouvertes
- Prix et limites commerciaux par activité.
- Budget mensuel et seuils d'alerte FCFA.
- Seuil de remboursement à double validation.
- Confirmation mesurée des objectifs disponibilité, performance, RPO, RTO.
- Rétention des sauvegardes et capacités S3.
- Vérification du droit sénégalais : données, transferts, conservation, notification, facturation, suppression.
- Horaires de couverture, escalades et responsables.
- Canaux de notification réellement disponibles.
- Fermeture de compte, période de suppression, conservation légale.
- Durées de session et protections réellement présentes dans le code.

## 14. Feuille de route
1. Revoir le dépôt et les décisions existantes, sans modifier.
2. Comparer le code actuel au document et relever preuves/écarts/risques.
3. Prioriser les écarts par sécurité, intégrité, continuité, conformité et valeur métier.
4. Préparer un plan limité avec dépendances, tests, retour arrière et critères d'acceptation.
5. Obtenir autorisation explicite avant toute modification ; tester en isolé puis préproduction.
6. Obtenir autorisation explicite de production ; surveiller et produire un rapport.

## Règle finale
La sécurité et l'intégrité priment sur la disponibilité artificielle. Une opération incertaine reste incertaine jusqu'à vérification. Aucun contrôle, objectif ou test n'est réputé accompli sans preuve. Ce document n'autorise pas à modifier le code, la base de données ou la production.
