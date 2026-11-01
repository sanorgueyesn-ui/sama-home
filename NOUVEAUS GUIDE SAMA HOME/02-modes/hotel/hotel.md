# SAMA HOME — `hotel.md`
## Référence fonctionnelle et technique complète de la section Hôtel

**Version :** 1.0  
**Date :** 26 octobre 2026  
**Périmètre :** version Hôtel uniquement  
**Usage :** document de référence pour comprendre, concevoir, implémenter et tester la section Hôtel de SAMA HOME.  
**Voir aussi :** [index](../../README.md) · [guide général](../../00-guide-general.md) · [écarts avec le code](../../03-etat-reel-et-ecarts.md) · [décisions ouvertes](../../04-decisions-ouvertes.md) · maquette : `maquette-dashboard.png`  
**Note maquette :** les alertes « chambre à nettoyer » et « entretien à planifier » y figurent, mais le module n'existe pas : ne pas les afficher tant qu'il n'est pas livré (§4.4).

---

# 1. Objectif du document

Ce fichier rassemble les décisions confirmées dans la discussion, les éléments connus du projet SAMA HOME et des recommandations complémentaires pour couvrir les besoins importants d'un logiciel de gestion hôtelière.

Il doit servir de base de travail pour faire évoluer la section Hôtel sans reconstruire inutilement les fonctionnalités déjà présentes.

## 1.1 Classification des informations

- **CONFIRMÉ** : explicitement demandé ou validé dans la discussion.
- **CONTEXTE PROJET À VÉRIFIER** : décrit dans l'historique de SAMA HOME, mais à confirmer dans le dépôt actuel avant de coder.
- **RECOMMANDATION** : bonne pratique ajoutée pour rendre la section Hôtel plus complète.
- **À DÉCIDER** : règle qui ne doit pas être inventée par le développeur.

Ce document n'affirme pas que chaque fonction est déjà implémentée.

# 2. Périmètre de la version Hôtel

La version Hôtel gère un établissement hôtelier avec deux catégories d'unités visibles dans la maquette :
- Chambres
- Appartements appartenant à l'hôtel

La section couvre :
1. Tableau de bord
2. Chambres et appartements
3. Réservations
4. Check-in direct
5. Séjours / locations en cours
6. Prolongations et changements de chambre
7. Départs / check-out
8. Clients et fiches de séjour
9. Tarifs et durées
10. Paiements, acomptes et soldes
11. Dépenses
12. Factures, reçus, quittances et tickets
13. Bibliothèque PDF et impression
14. Rapports et indicateurs
15. Paramètres propres à l'hôtel
16. Comptes, permissions et journal d'audit
17. Fonctionnement hors ligne et synchronisation, si cette capacité est validée pour le déploiement.

**Hors périmètre :** les dashboards propres à une agence immobilière et à une résidence/chambre meublée comme variantes distinctes.

# 3. Navigation et actions rapides

## 3.1 Navigation Hôtel

Les entrées suivantes sont présentes dans la direction de maquette validée :
- Accueil
- Réservations
- Locations / séjours en cours
- Chambres
- Appartements
- Clients
- Paiements
- Dépenses
- Rapports
- Paramètres

Les libellés finaux doivent rester compatibles avec la navigation actuelle du projet.

## 3.2 Actions rapides confirmées

Le Dashboard doit offrir des accès directs à :
- **Nouvelle réservation**
- **Check-in direct**
- **Encaisser un paiement**
- **Ajouter une dépense**

Des raccourcis complémentaires vers Réservations, Locations, Chambres, Appartements, Clients, Paiements, Dépenses et Rapports sont souhaités. Chaque raccourci doit conduire à une fonction existante et opérationnelle.

# 4. Tableau de bord Hôtel

## 4.1 Présentation

- Interface simple, professionnelle et cohérente avec l'identité SAMA HOME.
- Le nom de l'hôtel et le compte utilisateur actif sont visibles.
- Les actions quotidiennes sont prioritaires.
- Les cartes statistiques doivent rester compactes.
- Les chiffres doivent provenir des données réelles, jamais de valeurs fictives codées en dur.

## 4.2 Indicateurs confirmés

- Chambres occupées / nombre total / disponibles.
- Appartements occupés / nombre total / disponibles.
- Réservations du jour.
- Arrivées et départs du jour.
- Locations en cours.
- Recettes du jour.
- Recettes du mois.
- Recettes de l'année.
- Dépenses du jour, si les données correspondantes existent.

Ne pas confondre une réservation, une facture émise et un paiement effectivement encaissé.

## 4.3 Les cinq dernières occupations

**CONFIRMÉ :**
- Afficher les 5 dernières chambres occupées.
- Afficher séparément les 5 derniers appartements occupés.
- Ne pas afficher les noms des clients dans ces listes.
- Afficher uniquement des informations opérationnelles utiles : numéro/code de l'unité, heure/date de début, durée écoulée et statut.

**À DÉCIDER :** déterminer si « dernière occupation » est triée selon l'heure réelle du check-in ou selon l'heure de début planifiée. Recommandation : utiliser l'heure effective d'arrivée quand elle est enregistrée.

## 4.4 Alertes opérationnelles

La maquette évoque :
- Arrivées prévues
- Départs à traiter
- Paiements restant à encaisser
- Chambre à nettoyer
- Entretien à planifier

Les alertes de ménage et de maintenance sont des recommandations à valider : ne pas les afficher si le module correspondant n'existe pas. Les alertes doivent provenir de données réelles, et non être décoratives.

# 5. Gestion des chambres et appartements

## 5.1 Données minimales à gérer

À comparer au modèle de données existant avant toute modification :
- Identifiant interne
- Numéro ou code visible
- Catégorie : chambre ou appartement
- État opérationnel
- Tarifs ou plans tarifaires associés
- Réservations et séjours liés
- Éventuelles notes internes selon les permissions

Ne pas ajouter de nouveaux champs sans inspection du schéma actuel.

## 5.2 États d'unité

La maquette distingue :
- Disponible
- Occupée
- Réservée
- Indisponible

**RECOMMANDATION :** si un flux de ménage est ajouté, distinguer éventuellement « à nettoyer », « nettoyage en cours » et « prête après inspection ». Ne pas mélanger l'état d'occupation avec l'état de propreté : une chambre peut être libre mais pas encore prête à être relouée.

## 5.3 Règles

- Une unité indisponible ne doit pas être proposée pour une nouvelle réservation.
- Une unité occupée ne doit pas être attribuée à un autre séjour qui chevauche le séjour actif.
- Le statut visible doit être calculé à partir des données et règles partagées, pas uniquement par du code de présentation.
- Les modifications d'état doivent être autorisées selon le rôle de l'utilisateur et tracées si elles affectent les opérations.

# 6. Réservations

## 6.1 Flux proposé

1. Cliquer sur « Nouvelle réservation ».
2. Choisir Chambre ou Appartement.
3. Sélectionner l'unité ou la catégorie, selon le fonctionnement existant.
4. Saisir la période ou la durée.
5. Vérifier la disponibilité côté serveur.
6. Choisir le tarif applicable.
7. Associer une fiche client ou créer le client selon les règles de l'hôtel.
8. Afficher un récapitulatif : unité, période, tarif, montant et paiement éventuel.
9. Enregistrer.
10. Afficher le statut et les prochaines actions possibles.

## 6.2 Annulation et absence

**RECOMMANDATION À VALIDER :**
- Gérer explicitement l'annulation d'une réservation.
- Définir le traitement d'un acompte en cas d'annulation.
- Définir le cas d'un client qui ne se présente pas (« no-show »).
- Libérer le créneau uniquement selon les statuts et règles métier confirmés.

Ne pas inventer de pénalités ou de politique de remboursement.

## 6.3 Disponibilité et chevauchements

**CONTEXTE PROJET À VÉRIFIER :** SAMA HOME a déjà été décrit avec la règle :
`nouveauDébut < finExistante AND nouvelleFin > débutExistant`

Les créneaux contigus sont autorisés. La liste des statuts qui bloquent un créneau doit être vérifiée dans le code réel.

Le contrôle d'interface est seulement indicatif. Le serveur doit revalider la disponibilité au moment de l'enregistrement, car deux utilisateurs peuvent réserver simultanément.

# 7. Check-in direct

**CONFIRMÉ :** le Dashboard Hôtel doit permettre d'enregistrer directement une arrivée.

## 7.1 Parcours

1. Cliquer sur « Check-in direct ».
2. Choisir Chambre ou Appartement.
3. Sélectionner une unité disponible.
4. Choisir la durée.
5. Afficher le tarif correspondant.
6. Fournir les informations client obligatoires selon la politique de l'hôtel.
7. Vérifier le résumé.
8. Enregistrer l'arrivée.
9. Mettre à jour le séjour actif, l'occupation et le Dashboard.
10. Proposer un reçu, ticket ou autre document uniquement selon le flux configuré.

Le check-in direct ne doit pas contourner les règles de disponibilité, de tarification, d'authentification ou de permissions.

## 7.2 Données client

Les champs obligatoires exacts ne sont pas confirmés. Il faut décider quelles informations sont nécessaires au Sénégal et pour l'activité de l'hôtel, et valider les obligations légales applicables avant de rendre un champ obligatoire.

# 8. Séjour, folio et prolongation

## 8.1 Compte de séjour (« folio ») — recommandation

Un compte de séjour peut regrouper :
- Montant de l'hébergement
- Prestations supplémentaires si elles sont prises en charge
- Ajustements autorisés
- Paiements reçus
- Solde restant

Cette structure est courante dans les logiciels hôteliers, mais le modèle exact du folio est **à décider** pour SAMA HOME. Elle ne doit pas être confondue avec une simple réservation ou un reçu.

## 8.2 Prolongation

1. Ouvrir le séjour en cours.
2. Vérifier les droits et le statut.
3. Calculer la nouvelle heure/date de fin.
4. Vérifier la disponibilité de l'intervalle supplémentaire.
5. Calculer le supplément selon la règle tarifaire validée.
6. Afficher le récapitulatif.
7. Enregistrer la modification dans une transaction.
8. Actualiser le solde, la disponibilité et le Dashboard.

Si une réservation ultérieure est en conflit, ne pas accepter silencieusement la prolongation.

## 8.3 Changement de chambre — recommandation à valider

Si le produit doit autoriser le déplacement d'un client :
- vérifier que l'unité de destination est disponible ;
- conserver l'historique du déplacement ;
- déterminer comment traiter la différence de tarif ;
- mettre à jour l'occupation des deux unités ;
- éviter qu'un changement de chambre efface l'historique du séjour.

# 9. Départ / check-out

## 9.1 Parcours proposé

1. Ouvrir le séjour actif.
2. Vérifier la date/heure de fin.
3. Recalculer les frais additionnels autorisés.
4. Afficher le total, les paiements reçus et le solde.
5. Appliquer la règle de l'hôtel concernant les soldes impayés.
6. Encaisser le solde si nécessaire.
7. Générer les documents requis.
8. Enregistrer le départ et le statut final.
9. Mettre à jour l'état de l'unité.
10. Si un ménage est pris en charge, créer la tâche de nettoyage après le départ.

**À DÉCIDER :** un check-out peut-il être finalisé avec un solde dû ? Quelles sont les règles pour un départ anticipé, un départ tardif et des frais supplémentaires ?

# 10. Moteur de durée et de tarif

## 10.1 Entrées

- Unité ou catégorie
- Début du séjour
- Durée et unité de durée
- Tarif actif
- Paramètres applicables

## 10.2 Calcul

1. Charger le tarif depuis la base de données.
2. Vérifier qu'il est applicable à la catégorie/unité et à la durée.
3. Calculer la fin de séjour.
4. Appliquer uniquement les frais, remises ou taxes configurés.
5. Afficher un récapitulatif.
6. Enregistrer les données tarifaires historiques nécessaires.

**CONTEXTE PROJET À VÉRIFIER :** le projet SAMA HOME a été décrit comme copiant la durée et le montant sur la réservation lors de sa création, afin qu'une modification future de tarif ne change pas silencieusement une réservation existante.

## 10.3 À décider

- Durées exactes pour l'hôtel
- Tarifs par unité ou catégorie
- Règles de journée/nuitée/heures supplémentaires
- Arrivée anticipée et départ tardif
- Arrondis
- Remises, taxes et frais
- Tarif applicable lors d'une prolongation après changement de tarif

Le navigateur ne doit jamais pouvoir imposer lui-même le montant final : le serveur doit calculer ou valider le montant.

# 11. Moteur de paiement et de solde

## 11.1 Valeurs distinctes

- Montant total dû
- Acompte reçu
- Paiements complémentaires
- Remboursements éventuels
- Total encaissé net
- Solde restant

Formule de base à adapter aux règles approuvées :
`solde = montant dû - paiements appliqués + ajustements définis`

## 11.2 Flux d'encaissement

1. Cliquer « Encaisser un paiement » ou ouvrir le séjour.
2. Afficher le montant dû, les paiements déjà enregistrés et le solde.
3. Saisir le montant.
4. Choisir le moyen de paiement autorisé.
5. Vérifier le récapitulatif.
6. Enregistrer le mouvement dans une transaction.
7. Recalculer le solde depuis les mouvements persistés.
8. Proposer le reçu/ticket après confirmation de l'enregistrement.

Le contexte mentionne espèces, Wave et Orange Money, mais les moyens réellement activés doivent être vérifiés. Le choix « Wave » ou « Orange Money » comme libellé ne prouve pas qu'une intégration API est active.

## 11.3 Anti-doublon et historique

- Un double clic ne doit pas créer deux paiements.
- Une requête renvoyée après coupure réseau ne doit pas créer un doublon.
- Les remboursements et corrections doivent être traçables.
- Un paiement ne doit pas être supprimé silencieusement.
- Un reçu ne doit être généré comme preuve de paiement qu'après enregistrement réussi.

# 12. Dépenses

**CONFIRMÉ :** le Dashboard comporte un raccourci « Ajouter une dépense ».

## Flux proposé

1. Ouvrir le formulaire de dépense.
2. Saisir le montant et les champs requis.
3. Choisir la catégorie, la date et le moyen de paiement si ces champs existent.
4. Ajouter une note ou un justificatif si la fonction est prévue.
5. Enregistrer.
6. Afficher la dépense dans la liste et les rapports.
7. Mettre à jour les indicateurs concernés.

Les catégories, champs obligatoires, corrections et autorisations restent à confirmer.

# 13. Factures, reçus, quittances et tickets

## 13.1 Différences fonctionnelles

- **Facture :** document récapitulant la prestation et les montants facturés.
- **Reçu :** preuve qu'un paiement a été enregistré.
- **Quittance :** preuve de règlement selon la règle retenue.
- **Ticket :** document compact pour impression rapide.

Ces définitions sont fonctionnelles et ne constituent pas une validation fiscale ou juridique. Vérifier les obligations applicables au Sénégal avant la mise en production.

## 13.2 Génération d'une facture

1. Depuis la réservation ou le séjour, demander une facture.
2. Le serveur vérifie les droits et charge les données persistées.
3. Le document affiche l'identité de l'hôtel, la référence, les dates, la prestation et les montants.
4. L'utilisateur prévisualise.
5. Le PDF est généré et enregistré.
6. La bibliothèque propose aperçu, téléchargement et impression.

Ne pas recalculer silencieusement un montant historique depuis un tarif modifié.

## 13.3 Reçu et ticket

1. Ouvrir un paiement enregistré.
2. Demander le reçu ou ticket.
3. Générer le document à partir du mouvement de paiement réel.
4. Enregistrer sa référence et le PDF.
5. Proposer aperçu, téléchargement et impression.

## 13.4 Numérotation et corrections

**À DÉCIDER :**
- Numérotation des documents
- Conditions d'émission
- Duplicata
- Annulation et correction
- Conservation de l'original
- Format A4, ticket thermique ou les deux
- Imprimantes prises en charge

Ne pas remplacer silencieusement un document financier déjà émis.

# 14. Bibliothèque PDF

## 14.1 Catégories

- Factures
- Reçus et justificatifs de paiement
- Quittances
- Tickets PDF
- Autres documents associés au séjour, si validés

## 14.2 Liste et recherche

Chaque entrée peut présenter :
- Type et numéro du document
- Date de création
- Référence de réservation/séjour/paiement
- Montant si applicable
- Statut
- Actions disponibles

Filtres proposés : type, période, référence, séjour, paiement. À valider selon les besoins réels.

## 14.3 Actions

- Aperçu
- Télécharger
- Imprimer
- Ouvrir la source selon les permissions
- Rééditer/régénérer selon la politique de version
- Voir l'historique si cette fonction est retenue

Les PDF privés ne doivent pas être exposés via des liens publics permanents.

**CONTEXTE PROJET À VÉRIFIER :** un test de stockage objet compatible S3 a été rapporté comme réussi, mais cela ne prouve pas que la bibliothèque PDF est déjà développée.

# 15. Rapports et indicateurs

## 15.1 Indicateurs confirmés

- Occupation des chambres
- Occupation des appartements
- Réservations du jour
- Arrivées et départs
- Séjours en cours
- Recettes du jour, du mois et de l'année
- Dépenses du jour si disponibles

## 15.2 Définitions à verrouiller

- **Recettes :** recommander la somme des paiements réellement enregistrés dans la période, pas la valeur des réservations.
- **Réservations du jour :** préciser si le chiffre signifie réservations créées aujourd'hui ou séjours prévus aujourd'hui.
- **Taux d'occupation :** définir la période, le dénominateur et le traitement des unités indisponibles.
- **Dépenses :** définir la date de référence et le traitement des corrections.
- **Solde net :** recettes moins dépenses peut être affiché comme résumé opérationnel, mais pas comme bénéfice comptable officiel sans règles plus complètes.

Les exports PDF/CSV/Excel et les rapports spécialisés sont à confirmer.

# 16. Moteurs techniques et architecture

## 16.1 Flux technique cible

```text
Interface Hôtel
  ↓
Action serveur / API authentifiée
  ↓
Vérification session + rôle + établissement
  ↓
Service métier partagé
  ├─ Disponibilité
  ├─ Réservation / séjour
  ├─ Durée / tarif
  ├─ Occupation
  ├─ Paiement / solde
  ├─ Dépense / recette
  └─ Document PDF
  ↓
Transaction et base de données
  ↓
Réponse confirmée
  ↓
Actualisation du Dashboard et des listes
```

L'interface améliore l'expérience utilisateur, mais les validations sensibles restent côté serveur.

## 16.2 Moteur de disponibilité

Le contexte du projet décrit la règle de chevauchement :
`nouveauDébut < finExistante AND nouvelleFin > débutExistant`

Le serveur doit revalider au moment de l'enregistrement. Le contrôle préalable du navigateur ne garantit pas la disponibilité si un autre utilisateur a réservé entre-temps.

## 16.3 Moteur d'occupation

Pour une date/heure donnée :
1. Charger les unités de l'établissement.
2. Identifier les séjours actifs.
3. Identifier les réservations bloquantes.
4. Prendre en compte les unités indisponibles.
5. Appliquer les règles de priorité des états.
6. Calculer les totaux séparément pour chambres et appartements.

Le taux peut être `unités occupées / unités prises en compte × 100`, mais la définition du dénominateur doit être décidée.

## 16.4 Moteur de recettes

1. Définir la période dans le fuseau de l'établissement.
2. Charger les paiements admissibles de cette période.
3. Appliquer les règles approuvées pour remboursements/annulations.
4. Additionner les montants.
5. Retourner les totaux jour, mois et année.

La date de référence (date d'encaissement, date de création ou autre) est à décider.

## 16.5 Transactions et sécurité

Le contexte du projet décrit Next.js App Router, TypeScript strict, Prisma et PostgreSQL. Il mentionne aussi une vérification de session côté serveur et des transactions sérialisables pour certains cas de concurrence. Confirmer dans le dépôt réel avant d'utiliser ces informations comme état actuel.

Les permissions doivent être vérifiées pour chaque opération sensible côté serveur, conformément aux recommandations OWASP sur le contrôle d'accès. Référence : https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authorization_Cheat_Sheet.md

# 17. Fonctionnement hors ligne et synchronisation

Le mode hors ligne et le logiciel installable sont des objectifs discutés, mais l'implémentation complète n'est pas confirmée.

## Recommandations
- Enregistrer localement les opérations autorisées avec un identifiant unique.
- Garder les opérations en attente après fermeture/redémarrage.
- Synchroniser vers le serveur quand la connexion revient.
- Marquer une opération synchronisée uniquement après confirmation fiable.
- Utiliser l'idempotence pour empêcher les doublons.
- Revalider les permissions et la disponibilité côté serveur.

Une réservation créée hors ligne doit être considérée comme en attente jusqu'à validation serveur si la politique retenue autorise ce scénario. Une opération saisie localement ne doit pas être présentée comme visible par tous les employés avant confirmation de synchronisation.

# 18. Recommandations complémentaires à considérer

Les points suivants sont inspirés de pratiques courantes de logiciels hôteliers et ne sont **pas confirmés comme fonctionnalités existantes** dans SAMA HOME.

## 18.1 Ménage et disponibilité réelle
Un statut « libre » ne signifie pas toujours « prête à accueillir un client ». Si le périmètre le justifie, ajouter un petit flux ménage : à nettoyer → nettoyage en cours → prête, avec rôles et historique.

## 18.2 Caisse par poste ou par équipe
Si plusieurs réceptionnistes encaissent, envisager une ouverture/fermeture de caisse, un montant attendu, un montant compté et un rapport d'écart. À développer uniquement après validation du besoin.

## 18.3 Audit financier
Tracer qui a créé, modifié, annulé ou remboursé un mouvement, quand et pourquoi. Favoriser des corrections traçables plutôt que des suppressions.

## 18.4 Folio / compte de séjour
Regrouper les frais et paiements d'un séjour dans un compte lisible. N'ajouter les extras (restaurant, minibar, blanchisserie, etc.) que si l'hôtel souhaite réellement gérer ces services dans SAMA HOME.

## 18.5 Audit de fin de journée
Un contrôle de fin de journée peut comparer arrivées, départs, encaissements et dépenses. L'automatisation comptable ou la clôture de journée ne doit pas être ajoutée sans définir les règles et les conséquences.

## 18.6 Déplacement, départ anticipé et no-show
Ce sont des cas opérationnels fréquents dans l'hôtellerie. Les ajouter uniquement avec des règles claires de disponibilité, tarification, facturation et historique.

## 18.7 Sauvegardes et restauration
Définir une procédure de sauvegarde et tester la restauration. Pour une version installable/hors ligne, les données locales et la file de synchronisation ne doivent pas être effacées lors d'une mise à jour.

## 18.8 Documents réglementaires
Confirmer auprès d'une source compétente les exigences locales applicables aux factures, reçus, données d'identité et transmissions administratives avant de figer les modèles.

Ces recommandations rejoignent des fonctions courantes décrites dans des documentations de logiciels hôteliers : folios, encaissements, check-in/check-out, ménage, caisse et rapports. Elles servent de pistes, pas de preuve d'une obligation ou d'une fonctionnalité déjà présente.

Sources de recherche complémentaires :
- Guide général de fonctionnement d'un module hôtelier : https://imsystem.cd/guides/hotel
- Documentation de folio et facturation hôtelière : https://docs.sdlccorp.com/docs/hotel-management/reservations/folio-billing/
- Flux de réception et check-in : https://www.hotelsoft.org/features/front-desk
- Facturation et folios : https://www.hotelsoft.org/features/billing
- Bonnes pratiques de contrôle d'accès OWASP : https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authorization_Cheat_Sheet.md

# 19. Tests d'acceptation minimum

1. Une unité disponible peut être réservée.
2. Un chevauchement est refusé.
3. Deux créneaux contigus sont autorisés.
4. Deux requêtes concurrentes ne confirment pas la même unité sur le même créneau.
5. Le tarif envoyé par le navigateur ne remplace pas le calcul serveur.
6. Un changement de tarif ne modifie pas silencieusement une réservation existante.
7. Le check-in direct respecte les mêmes validations que le flux de réservation.
8. Une prolongation conflictuelle est refusée ou soumise à résolution.
9. Un paiement renvoyé ne crée pas de doublon.
10. Un reçu n'est généré qu'après enregistrement du paiement.
11. Les recettes correspondent à la définition de période validée.
12. Les dépenses sont comptées une seule fois.
13. Les cinq chambres et cinq appartements sont affichés séparément.
14. Aucun nom de client n'apparaît dans ces deux listes du Dashboard.
15. Les documents PDF ne sont accessibles qu'aux utilisateurs autorisés.
16. Une erreur PDF ne modifie pas la réservation ni le paiement.
17. Les droits sont vérifiés côté serveur à chaque action sensible.
18. Les données d'un autre établissement ne sont pas accessibles.
19. Si le mode hors ligne est activé, les opérations en attente survivent à un redémarrage et ne sont pas dupliquées après synchronisation.
20. Une mise à jour ne supprime pas les données locales ou la file de synchronisation.

# 20. Décisions à confirmer avant développement

1. Statuts exacts et transitions des réservations/séjours.
2. Durées et tarifs applicables aux hôtels.
3. Règles de prolongation, départ anticipé et départ tardif.
4. Politique de départ avec solde impayé.
5. Moyens de paiement réellement disponibles et intégrations API éventuelles.
6. Politique de remboursement et d'annulation.
7. Numérotation des factures, reçus, quittances et tickets.
8. Formats et imprimantes supportés.
9. Règles fiscales et juridiques applicables au Sénégal.
10. Définition des recettes du jour, du mois et de l'année.
11. Définition du taux d'occupation.
12. Rôles et permissions des employés.
13. Inclusion ou non du ménage, de la maintenance, de la caisse et des extras.
14. Fonctions exactes autorisées hors ligne.
15. Politique de conservation et de correction des documents.

# 21. Méthode d'intégration au projet

Avant d'implémenter :
1. Vérifier la branche Git, les modifications locales et le répertoire exact.
2. Lire les modèles Prisma et les actions métier existantes.
3. Repérer les moteurs déjà présents et leurs tests.
4. Comparer chaque exigence de ce fichier au code réel.
5. Marquer chaque point : déjà implémenté, incomplet, absent ou à décider.
6. Proposer un plan de modification ciblé.
7. Tester sur une base dédiée ou une copie sûre, pas sur la production.
8. Ne pas pousser vers un déploiement automatique tant que les tests demandés ne sont pas terminés.

**Règle finale :** réutiliser les règles et services existants, éviter les doublons, préserver les données et ne jamais transformer une recommandation de ce document en comportement de production sans validation.
