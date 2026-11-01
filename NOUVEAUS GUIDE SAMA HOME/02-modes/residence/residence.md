# SAMA HOME — Référence complète de la section Résidence / Chambres et appartements meublés

**Fichier de référence fonctionnelle et technique — version de travail**  
**Périmètre :** gestion d’une résidence, de chambres meublées, d’appartements meublés et de locations flexibles de courte ou moyenne durée dans SAMA HOME.  
**Objectif :** centraliser les décisions déjà confirmées, les besoins fonctionnels, les recommandations issues de recherches et les points à valider avant développement.  
**Voir aussi :** [index](../../README.md) · [guide général](../../00-guide-general.md) · [écarts avec le code](../../03-etat-reel-et-ecarts.md) · [décisions ouvertes](../../04-decisions-ouvertes.md) · maquette : `maquette-dashboard.png`  
**Note maquette :** elle reprend le menu Hôtel (Chambres, Appartements), alors que §3 prévoit Accueil / Locataires / Biens sur mobile. La source qui fait foi est à trancher.

> **Règle de lecture**
> - **CONFIRMÉ** : décision explicitement formulée ou validée dans les échanges précédents.
> - **RECOMMANDATION** : proposition utile, non considérée comme déjà approuvée.
> - **À CONFIRMER** : décision produit, commerciale ou juridique encore ouverte.
> - **À VÉRIFIER DANS LE CODE** : ne pas supposer que la fonction existe déjà. Inspecter le dépôt actuel avant toute modification.

---

## 1. Vision et décisions confirmées

### 1.1 Les trois modes SAMA HOME

**CONFIRMÉ**
SAMA HOME est une seule application qui doit proposer trois modes métier distincts :
1. **Résidence / chambres et appartements meublés** ;
2. **Hôtel** ;
3. **Agence immobilière**.

Le mode Résidence est centré sur l’exploitation de logements meublés avec des durées flexibles et une gestion simple des réservations, des séjours et des encaissements. Le mode Hôtel peut avoir des opérations de réception et de service hôtelier plus poussées ; le mode Agence traite notamment les mandats, annonces, ventes et baux de longue durée.

**CONFIRMÉ**
- Une seule application, avec une expérience et des fonctionnalités adaptées au mode choisi.
- L’interface doit être simple et professionnelle.
- Le mobile est important ; le web mobile fonctionne en ligne.
- Le fonctionnement hors ligne sur ordinateur est un objectif confirmé.
- Windows et macOS sont les plateformes ordinateur visées.
- Tester localement avant toute publication.
- Ne pas pousser sur GitHub ni déployer sans autorisation explicite.
- Préserver les données existantes lors des mises à jour.
- Les règles importantes doivent être centralisées dans les paramètres.

**À VÉRIFIER DANS LE CODE**
La séparation effective des modes, les routes, les permissions, les modèles Prisma, les migrations, la synchronisation et l’installation ordinateur. Les décisions produit ne prouvent pas que tout est déjà implémenté.

### 1.2 Utilisateurs visés

**RECOMMANDATION**
- propriétaires exploitant quelques logements ;
- résidences meublées indépendantes ;
- gestionnaires de plusieurs appartements ;
- petites structures avec plusieurs agents ou réceptionnistes ;
- exploitants qui gèrent actuellement réservations et paiements par cahier, Excel et WhatsApp.

Le produit doit être utilisable sans formation technique et éviter les opérations répétitives.

---

## 2. Écran d’accueil et sélection du mode

### 2.1 Accueil Résidence

**CONFIRMÉ — principe visuel**
La section Résidence doit avoir un accueil visuellement cohérent avec l’écran Hôtel, mais clairement orienté vers les appartements et chambres meublés. Un visuel d’arrière-plan adapté — appartement meublé, salon moderne, chambre accueillante ou résidence — peut servir de fond, à condition que le texte reste lisible.

**RECOMMANDATION**
- Titre : **« Gérez vos chambres et appartements meublés simplement »**.
- Sous-texte : « Réservations, séjours, paiements et dépenses réunis dans un seul espace ».
- Bouton principal d’accès au mode Résidence.
- Identification claire du mode actif.
- Possibilité de changer de mode si le compte y est autorisé.
- Ne pas confondre l’écran d’accueil de présentation avec le tableau de bord après connexion.

### 2.2 Passer d’un mode à l’autre

**CONFIRMÉ**
Les trois modes appartiennent à une seule application.

**RECOMMANDATION**
- Proposer un sélecteur de mode dans les paramètres de l’organisation ou dans le menu du compte.
- Le changement de mode ne doit jamais supprimer ou convertir silencieusement les données.
- Les fonctionnalités visibles doivent respecter l’abonnement et les droits de l’utilisateur.
- Si un compte exploite une résidence et un hôtel, définir clairement si les données et les unités peuvent être partagées ou si elles doivent rester séparées.

**À CONFIRMER**
Un abonnement peut-il activer simultanément plusieurs modes ? Le principe des trois modes est confirmé, mais la règle commerciale et le partage des données restent à définir.

---

## 3. Navigation

La navigation doit privilégier les opérations les plus fréquentes et rester simple sur téléphone.

**CONFIRMÉ — préférence mobile antérieure pour SAMA HOME**
Barre inférieure mobile limitée à :
- **Accueil**
- **Locataires**
- **Biens**

Le bouton **Menu** en haut à droite ouvre les fonctions secondaires. Conserver cette préférence si elle est compatible avec l’architecture actuelle.

### Menu secondaire recommandé
- Réservations
- Locations en cours
- Calendrier
- Clients / locataires
- Tarifs
- Paiements
- Dépenses
- Rapports
- Documents
- Paramètres

### Actions rapides
- Nouvelle réservation
- Arrivée directe / démarrer une location
- Enregistrer un paiement
- Ajouter une dépense
- Prolonger un séjour
- Enregistrer un départ
- Ajouter un logement
- Consulter les disponibilités

Les actions doivent être visibles selon les permissions et le contexte du logement.

---

## 4. Tableau de bord Résidence

Le tableau de bord doit permettre de répondre rapidement à ces questions :
1. Quels logements sont disponibles maintenant ?
2. Quels séjours sont en cours et lesquels commencent ou se terminent aujourd’hui ?
3. Combien a été encaissé aujourd’hui, ce mois-ci et cette année ?
4. Quels clients ont un solde à payer ?
5. Quels logements sont à nettoyer, en maintenance ou indisponibles ?

### 4.1 Cartes de synthèse

**RECOMMANDATION**
- Nombre total de logements actifs ;
- logements disponibles ;
- logements occupés ;
- arrivées du jour ;
- départs du jour ;
- réservations à venir ;
- séjours en cours ;
- recettes du jour ;
- recettes du mois ;
- recettes de l’année ;
- soldes clients à recouvrer ;
- dépenses de la période ;
- logements en maintenance ou à nettoyer.

Ne pas surcharger l’écran : montrer les indicateurs les plus utiles et permettre d’accéder aux détails en touchant une carte.

### 4.2 Listes du tableau de bord

- arrivées prévues aujourd’hui ;
- départs prévus aujourd’hui ;
- séjours en cours ;
- réservations proches ;
- paiements partiels ou soldes impayés ;
- logements indisponibles ;
- logements nécessitant un nettoyage ou une intervention, si ce module est activé.

### 4.3 Règles de fiabilité

- Les recettes doivent provenir des paiements enregistrés, avec un état clair (saisi, confirmé, annulé).
- Distinguer montant attendu, montant reçu et solde restant.
- Ne pas compter une réservation annulée comme une location active.
- Distinguer disponibilité commerciale, occupation effective et statut de nettoyage.
- Ne pas inventer de chiffres de démonstration dans les données de production.

---

## 5. Gestion des biens : chambres et appartements

### 5.1 Types de logements

**RECOMMANDATION**
- chambre meublée ;
- studio ;
- appartement ;
- suite ;
- villa / maison meublée ;
- logement indépendant ;
- autre type configurable.

La liste doit être centralisée dans les paramètres, si le modèle actuel le permet.

### 5.2 Fiche du logement

Champs à prévoir ou à vérifier :
- référence interne ;
- nom/numéro du logement ;
- type ;
- bâtiment ou résidence ;
- étage, si applicable ;
- capacité maximale ;
- nombre de chambres et salles d’eau, selon le type ;
- équipements ;
- description interne ;
- photos ;
- statut d’exploitation ;
- règles de disponibilité ;
- tarifs associés ;
- date de mise en service ;
- notes internes ;
- historique des séjours, paiements, dépenses et interventions.

Ne rendre obligatoires que les champs utiles au type de logement.

### 5.3 Statuts séparés

**RECOMMANDATION**
Séparer les dimensions suivantes :
- **Exploitation** : actif, archivé ;
- **Disponibilité** : disponible, réservé, indisponible ;
- **Occupation** : libre, occupé ;
- **Entretien** : propre, à nettoyer, nettoyage en cours, maintenance ;
- **Réservation** : en attente, confirmée, annulée, terminée.

Ne pas utiliser un seul statut pour représenter des situations différentes. Une chambre peut être libre mais sale, ou occupée tout en ayant une réservation future.

### 5.4 Archivage

- Ne pas supprimer un logement ayant des réservations, paiements ou documents historiques.
- Archiver plutôt que supprimer lorsqu’un historique doit être conservé.
- Un logement archivé ne doit pas apparaître comme disponible à la réservation.
- La suppression définitive, si elle existe, doit être réservée aux cas sans historique et protégée par confirmation.

---

## 6. Tarifs flexibles et règles de durée

### 6.1 Principe confirmé

**CONFIRMÉ**
La résidence doit pouvoir gérer des locations à durées flexibles. Le contexte du projet mentionne notamment des durées telles que **2 heures, 3 heures, 12 heures et 24 heures**, ainsi que des tarifs par durée et par logement.

### 6.2 Tarifs par logement

Chaque tarif devrait définir :
- logement ou catégorie concernée ;
- libellé ;
- unité de durée : heure, nuit, jour, semaine ou mois selon les besoins validés ;
- quantité de durée ;
- prix ;
- éventuelles dates de validité ;
- conditions d’utilisation ;
- statut actif/inactif.

**RECOMMANDATION**
- Autoriser plusieurs tarifs pour un même logement.
- Éviter les tarifs codés en dur dans les composants.
- Permettre au gestionnaire de désactiver un tarif sans supprimer l’historique des réservations déjà créées.
- Les tarifs week-end, promotions, heures supplémentaires et prolongations sont à valider avant automatisation.

### 6.3 Calcul de fin de séjour

- La date/heure de fin doit être calculée à partir de la durée choisie et de la règle configurée.
- La règle d’arrondi, de retard, de dépassement et de prolongation doit être définie explicitement.
- Une modification du tarif ne doit pas changer rétroactivement le prix d’une réservation existante.
- La durée et le montant convenus au moment de la création doivent rester consultables dans l’historique.

**À VÉRIFIER DANS LE CODE**
Le contexte antérieur du projet décrit un comportement de copie de la durée et du montant au moment de la réservation. Vérifier le modèle et le code actuels avant de considérer ce comportement comme garanti pour tous les parcours.

### 6.4 Départ anticipé et prolongation

**RECOMMANDATION**
- Enregistrer le départ anticipé sans écraser les dates prévues initialement.
- Afficher clairement la durée prévue et la durée réelle.
- Calculer tout supplément ou remboursement uniquement selon une règle validée.
- Vérifier la disponibilité avant une prolongation.
- Ne pas prolonger si cela chevauche une réservation confirmée, sauf workflow explicite de résolution.

---

## 7. Réservations et disponibilité

### 7.1 Création d’une réservation

Parcours recommandé :
1. choisir les dates/heures ou la durée ;
2. sélectionner un logement disponible ;
3. choisir ou créer le client ;
4. sélectionner le tarif ;
5. afficher le montant total ;
6. saisir acompte ou paiement, si applicable ;
7. confirmer la réservation ;
8. produire une confirmation ou un reçu si le système le permet.

Les champs obligatoires et la possibilité de réserver sans coordonnées complètes doivent être définis dans les paramètres.

### 7.2 Calendrier

**RECOMMANDATION**
- vue par logement ;
- vue journalière, hebdomadaire et mensuelle selon le besoin ;
- couleurs accessibles accompagnées de libellés, pour ne pas dépendre uniquement des couleurs ;
- filtres par bâtiment, type et statut ;
- accès direct au dossier depuis un créneau ;
- affichage clair des périodes bloquées et des interventions.

### 7.3 Règle de chevauchement

Le contexte technique du projet décrit la règle générale :
`nouveauDébut < finExistante AND nouvelleFin > débutExistant`.

Cette règle signifie que deux périodes qui se chevauchent sont en conflit, tandis que deux créneaux exactement contigus peuvent être acceptés. **À vérifier dans le code actuel** et dans les cas spécifiques aux durées horaires, aux jours et aux nuits.

### 7.4 Concurrence

Le contexte antérieur décrit un test de concurrence ayant utilisé des transactions Prisma avec isolation `Serializable` sur le module Réservations, mais il faut confirmer le code présent et les garanties effectives avant réutilisation dans le mode Résidence.

À tester :
- deux demandes simultanées pour le même logement ;
- réservation créée alors qu’un autre utilisateur réserve le créneau ;
- annulation pendant une tentative de réservation ;
- prolongation qui chevauche un nouveau séjour ;
- fuseaux horaires, changement de jour et limites de durée ;
- reprise après une erreur de transaction.

Ne jamais se fier uniquement à l’indicateur visuel « disponible » côté interface : la vérification définitive doit être faite côté serveur.

---

## 8. Arrivée directe et séjour en cours

### 8.1 Arrivée sans réservation

**CONFIRMÉ — besoin du projet**
Le tableau de bord doit permettre un parcours rapide pour démarrer une location directement, sans devoir passer par la création préalable d’une réservation.

Parcours recommandé :
1. choisir chambre ou appartement ;
2. afficher uniquement les logements disponibles selon les règles ;
3. choisir la durée et le tarif ;
4. sélectionner/créer le client selon les règles d’identification ;
5. saisir un paiement ou acompte ;
6. confirmer ;
7. afficher le logement comme occupé et le séjour dans les locations en cours.

### 8.2 Dossier de séjour

- logement ;
- client ;
- heure/date de début réelle ;
- fin prévue ;
- tarif et durée convenus ;
- montant total ;
- paiements et solde ;
- statut ;
- historique de prolongations ;
- notes internes ;
- documents associés.

### 8.3 Identification du client

**CONFIRMÉ**
Les règles d’identification doivent être configurables dans les paramètres, séparément pour les chambres et les appartements.

**À CONFIRMER**
- Seuil de durée ou de montant à partir duquel une pièce d’identité est obligatoire ;
- types de pièces acceptées ;
- champs à enregistrer ;
- accès aux documents ;
- durée de conservation ;
- règles de vérification et exigences légales applicables.

Ne pas imposer une règle juridique précise sans vérification actuelle. Collecter le minimum nécessaire et protéger les documents d’identité.

### 8.4 Prolongation

- vérifier le créneau supplémentaire ;
- afficher le nouveau montant avant validation ;
- conserver la durée initiale et chaque prolongation ;
- enregistrer le paiement additionnel et le solde ;
- actualiser la fin prévue après confirmation ;
- bloquer les chevauchements non autorisés.

---

## 9. Départ et clôture du séjour

Fonctions recommandées :
- enregistrer l’heure de départ réelle ;
- calculer le solde restant ;
- vérifier les paiements ;
- gérer les suppléments selon une règle configurée ;
- signaler un dommage ou un objet manquant, si le module le permet ;
- enregistrer le statut de nettoyage ;
- libérer le logement seulement lorsque le workflow de départ le permet ;
- conserver l’historique complet.

**À CONFIRMER**
La libération du logement doit-elle être immédiate au départ, ou rester « à nettoyer » et indisponible jusqu’à validation du ménage ? Recommandation : séparer l’occupation du statut de nettoyage.

---

## 10. Clients et historique

### Fiche client
- nom ou libellé selon les règles de collecte ;
- téléphone ;
- informations de contact facultatives ;
- document d’identité si nécessaire et autorisé ;
- préférences utiles ;
- réservations et séjours ;
- paiements et soldes ;
- documents ;
- notes limitées aux informations professionnelles utiles.

### Règles
- éviter les doublons, sans fusion automatique irréversible ;
- rechercher par nom, téléphone et référence ;
- limiter l’accès aux données personnelles ;
- permettre la correction d’une fiche avec historique ;
- ne pas afficher les noms des clients sur des vues publiques ou des cartes du tableau de bord qui n’en ont pas besoin.

**CONFIRMÉ — préférence d’affichage du tableau de bord**
Pour l’accueil Hôtel travaillé précédemment, les cinq dernières chambres occupées et les cinq derniers appartements occupés doivent être présentés séparément, sans nom de client. Pour le mode Résidence, conserver ce principe de confidentialité comme recommandation cohérente, à confirmer si le tableau de bord final est différent.

---

## 11. Paiements, acomptes et soldes

### 11.1 Moyens de paiement

**CONFIRMÉ DANS LE CONTEXTE DU PROJET**
L’application doit permettre d’enregistrer les moyens de paiement suivants :
- espèces ;
- Wave ;
- Orange Money ;
- autres moyens configurables si besoin.

Cela confirme le suivi manuel du moyen de paiement, **pas** l’existence d’une API Wave/Orange Money, d’un encaissement automatique ou d’une intégration bancaire.

### 11.2 Données d’un paiement

- référence unique ;
- réservation/séjour ;
- date et utilisateur ;
- montant ;
- moyen de paiement ;
- référence de transaction, si disponible ;
- statut de l’opération ;
- justificatif ;
- montant dû avant et après l’opération.

### 11.3 Paiements partiels

**RECOMMANDATION**
- Autoriser acompte, paiement partiel, règlement du solde et paiement complémentaire.
- Calculer le solde à partir des paiements valides.
- Ne jamais afficher « payé » si un solde reste dû.
- Distinguer un paiement saisi d’un paiement vérifié.
- Empêcher les doublons et tracer les annulations.
- Ne pas supprimer silencieusement une opération financière déjà confirmée.

### 11.4 Reçu

- numéro unique ;
- date ;
- établissement ;
- logement ;
- client selon les données nécessaires ;
- montant reçu ;
- mode de paiement ;
- référence du séjour ;
- solde restant, si applicable ;
- génération PDF/impression seulement si le module existe et a été testé.

---

## 12. Dépenses et rentabilité

### Dépenses possibles
- nettoyage ;
- eau et électricité ;
- internet ;
- entretien et réparation ;
- linge et consommables ;
- achats pour les logements ;
- commissions et frais ;
- autres catégories configurables.

### Données
- date ;
- catégorie ;
- montant ;
- mode de paiement ;
- bénéficiaire/fournisseur ;
- logement concerné, si applicable ;
- note ;
- justificatif ;
- utilisateur ayant enregistré l’opération.

**RECOMMANDATION**
- séparer les dépenses d’un logement des dépenses générales ;
- filtrer par jour, mois, année, logement et catégorie ;
- suivre recettes, dépenses et résultat estimé ;
- conserver les justificatifs ;
- corriger une dépense avec une trace plutôt que la supprimer silencieusement.

**À VÉRIFIER DANS LE CODE**
Le contexte projet mentionne une feuille de dépenses dans un ancien fichier Excel de gestion et des méthodes de paiement Wave, Orange Money, espèces et Woyofal. Cela ne signifie pas que toutes ces catégories ou fonctions sont présentes dans le code SAMA HOME.

---

## 13. Entretien, ménage et maintenance

**RECOMMANDATION À ÉVALUER**
- statut « à nettoyer / en cours / propre » ;
- liste des logements à préparer après départ ;
- tâches assignées à un membre de l’équipe ;
- déclaration d’une panne ;
- indisponibilité pendant les réparations ;
- historique des interventions ;
- coûts liés au logement ;
- alertes si une arrivée est prévue mais que le logement n’est pas prêt.

Le module doit rester proportionné au fonctionnement d’une petite résidence et ne pas imposer une interface complexe si une simple liste de tâches suffit.

---

## 14. Factures, reçus et bibliothèque de documents

Documents possibles :
- reçu d’acompte ;
- reçu de paiement ;
- facture ou facture pro forma, selon les besoins validés ;
- confirmation de réservation ;
- fiche de séjour ;
- contrat ou document de location ;
- inventaire/état des lieux ;
- justificatifs de dépense ;
- rapport financier.

### Règles
- modèles personnalisables avec logo et coordonnées ;
- numérotation cohérente ;
- aperçu avant impression ;
- stockage dans le dossier concerné ;
- accès protégé ;
- conservation du document déjà émis même si le modèle change ;
- ne pas afficher de signature ou de certification inexistante.

**À VÉRIFIER DANS LE CODE**
Une intégration S3 compatible a été testée antérieurement selon les échanges, mais vérifier le code, les politiques d’accès, les sauvegardes et les usages réels avant de supposer que la bibliothèque documentaire est prête.

---

## 15. Rapports et statistiques

### Indicateurs recommandés
- occupation par logement et par période ;
- recettes par jour, mois et année ;
- paiements par moyen ;
- soldes clients ;
- dépenses par période et par catégorie ;
- logements les plus utilisés ;
- durée moyenne des séjours ;
- taux d’annulation ;
- prolongations ;
- logements indisponibles et jours de maintenance ;
- recettes nettes estimées après dépenses.

### Fiabilité
- préciser la période et les filtres ;
- différencier montants prévus, enregistrés et confirmés ;
- exclure ou isoler les opérations annulées ;
- définir le calcul d’occupation pour les durées horaires, journalières et mensuelles ;
- ne pas comparer des logements avec des durées différentes sans expliquer la méthode ;
- permettre l’export PDF/CSV si l’architecture et les permissions le permettent.

---

## 16. Équipe, rôles et permissions

**RECOMMANDATION**
Rôles possibles :
- administrateur / propriétaire ;
- gestionnaire ;
- réceptionniste ;
- comptable / caisse ;
- entretien / ménage ;
- lecture seule.

Ces rôles sont proposés et ne sont pas une confirmation de la liste actuelle des rôles dans le code.

### Sécurité
- contrôle serveur sur chaque lecture et mutation sensible ;
- accès aux données limité à l’établissement et à l’organisation ;
- permissions distinctes pour finances, identité, documents, paramètres et utilisateurs ;
- journal des opérations sensibles ;
- pas de secrets ou de documents privés dans les logs ;
- révocation effective des accès.

**À VÉRIFIER DANS LE CODE**
Les mécanismes d’authentification, `verifySession()`, les permissions et l’isolation des données doivent être examinés dans le dépôt actuel.

---

## 17. Paramètres centralisés

**CONFIRMÉ**
L’utilisateur souhaite que les règles métier et la personnalisation soient centralisées dans les paramètres.

### Paramètres à prévoir
- identité de l’établissement et logo ;
- types de logements ;
- tarifs et durées ;
- règles de prolongation et de dépassement ;
- seuils d’identification séparés chambre/appartement ;
- champs de client obligatoires ;
- moyens de paiement ;
- catégories de dépenses ;
- modèles et numérotation des documents ;
- règles de notification ;
- utilisateurs et permissions ;
- devise et formats ;
- langues disponibles ;
- apparence ;
- abonnement et compteurs ;
- politique d’archivage.

### Apparence

**CONFIRMÉ**
- préserver l’identité SAMA HOME par défaut ;
- permettre la personnalisation dans les paramètres ;
- préférer une esthétique sombre, douce et reposante ;
- si le thème clair est disponible, utiliser un gris doux teinté plutôt qu’un fond blanc pur ;
- identité visuelle connue : navy `#12304A`, corail `#E5484D`, orange `#F59E0B`, texte `#172026`, fond de référence `#F7F8F6`, police Manrope.

Les couleurs et polices doivent réutiliser les tokens existants plutôt que d’être redéfinies dans chaque écran.

---

## 18. Abonnements et compteurs

**À VÉRIFIER DANS LE REGISTRE MAÎTRE**
Les plafonds exacts de la Résidence ne doivent pas être déduits des tarifs du mode Agence ou Hôtel. Il faut conserver une séparation claire des compteurs et règles de chaque mode.

### Recommandation
- compteur de logements actifs ;
- compteur de réservations ou de séjours, uniquement si le modèle commercial le nécessite ;
- nombre d’utilisateurs ;
- nombre d’établissements, si multi-sites ;
- stockage documentaire, si facturé ;
- afficher l’usage et avertir avant la limite ;
- ne jamais supprimer les données au dépassement ;
- rendre les changements de forfait non destructifs.

**À CONFIRMER**
- prix et limites définitifs de Résidence ;
- essai gratuit ;
- utilisateurs inclus ;
- nombre d’établissements ;
- règles de blocage après impayé ;
- partage d’un abonnement entre Résidence et Hôtel.

Ne pas inventer une grille tarifaire ou présenter une hypothèse comme prix officiel.

---

## 19. Mode hors ligne et synchronisation

**CONFIRMÉ**
- mode hors ligne visé sur ordinateur ;
- usage web mobile en ligne ;
- Windows et macOS prévus ;
- tests locaux avant publication.

### Recommandations techniques
- inspecter d’abord l’architecture offline réellement existante ;
- afficher l’état de connexion et de synchronisation ;
- mettre en file d’attente uniquement les opérations prises en charge ;
- attribuer un identifiant stable aux opérations ;
- prévenir les doublons ;
- définir la résolution des conflits ;
- préserver les données locales après fermeture brutale ;
- ne pas afficher une confirmation serveur lorsqu’une opération est seulement enregistrée localement ;
- limiter et protéger le cache des données personnelles ;
- tester la reprise après coupure.

### Paiements hors ligne

**À CONFIRMER**
Les paiements saisis hors ligne doivent-ils être autorisés avec le statut « en attente de synchronisation » ? Recommandation : ne pas les présenter comme confirmés par le serveur avant validation. Les annulations, remboursements et opérations sensibles doivent suivre une règle explicite.

### Scénarios de test
- créer une réservation hors ligne puis synchroniser ;
- démarrer une location hors ligne ;
- saisir un paiement en attente ;
- coupure pendant la synchronisation ;
- double envoi d’une opération ;
- conflit de disponibilité ;
- changement de droits pendant l’absence de connexion ;
- redémarrage avant synchronisation.

---

## 20. Sécurité et confidentialité

- Ne montrer les informations client qu’aux utilisateurs autorisés.
- Ne pas exposer les noms de clients sur les écrans publics.
- Restreindre l’accès aux pièces d’identité et aux justificatifs.
- Contrôler les fichiers côté serveur avant téléchargement.
- Journaliser les opérations financières et les changements sensibles.
- Prévenir les accès inter-établissements.
- Éviter la suppression silencieuse de données historiques.
- Définir une politique de conservation des données et de suppression conforme aux obligations applicables.
- Ne pas collecter plus de données personnelles que nécessaire.

---

## 21. Contexte juridique au Sénégal — prudence

Une recherche sur le site du Ministère sénégalais chargé du Tourisme a retrouvé une page officielle qui référence le décret n° 2005-145 du 2 mars 2005 sur les établissements d’hébergement touristique, ainsi qu’une procédure d’agrément et une fiche d’autorisation d’ouverture. La page ministérielle liste notamment des éléments administratifs et des exigences de dossier. **Cela ne permet pas de conclure que chaque résidence meublée relève exactement de la même catégorie : il faut confirmer la classification juridique de l’établissement et la réglementation en vigueur auprès de l’autorité compétente.**

Sources officielles :
- Ministère de la Culture, de l’Artisanat et du Tourisme — demande d’agrément : https://mcat.gouv.sn/service/demande-dagrement-pour-les-etablissements-dhebergement-touristique/
- Ministère — autorisation d’ouverture à l’exploitation : https://mcat.gouv.sn/service/demande-dautorisation-douverture-a-lexploitation-detablissements-dhebergement-touristique/
- Texte du décret référencé par le Ministère : https://mcat.gouv.sn/download/decret/

### Précautions produit
- Ne pas présenter un modèle de contrat comme juridiquement validé sans revue locale.
- Ne pas coder en dur des frais, taxes, pénalités ou obligations d’identification sans vérification actuelle.
- Permettre d’archiver les documents et informations exigés pour l’exploitation, selon les règles applicables.
- Faire valider les obligations de sécurité, d’hygiène, d’autorisation, d’assurance, de déclaration et de conservation par un professionnel ou l’autorité compétente.
- Les locations saisonnières et l’hébergement touristique peuvent avoir des régimes différents selon la nature réelle de l’activité.

---

## 22. Recherches sur les solutions comparables

Ces pages ont servi à repérer des fonctions utiles, pas à établir que SAMA HOME les possède déjà :
- **Gestinno** : séparation hôtel/résidence, tarifs flexibles, réservations, paiements, statistiques et rôles — https://gestinno.com/
- **1412 PMS** : réception, paiements partiels, folios, housekeeping et rapports — https://1412pms.com/
- **Logement Meublé** : réservation express, suivi des recettes, moyens de paiement et indicateurs — https://logementmeuble.com/
- **GestoclocPro** : calendrier de disponibilité, courte et longue durée, cautions, états des lieux et prolongations — https://gestoclocpro.com/fr/logiciel/immobilier/
- **SenRent** : biens, locataires, paiements et quittances — https://senrent.com/
- **Dekk** : bâtiments, locataires, paiements, documents, historique et portail locataire — https://dekk.semedome.com/

Les offres et fonctionnalités commerciales peuvent évoluer. Elles ne constituent pas des engagements de SAMA HOME, et les prix de ces sites ne doivent pas être copiés sans analyse.

---

## 23. Architecture et intégration

### Stack connue du projet

Le contexte antérieur mentionne :
- Next.js App Router ;
- React ;
- TypeScript strict ;
- Tailwind CSS ;
- Prisma ;
- PostgreSQL ;
- stockage objet compatible S3 testé précédemment.

**À VÉRIFIER DANS LE CODE**
Versions, schéma actuel, conventions, actions serveur, authentification, stockage et tests.

### Règles d’intégration
- réutiliser les composants et tokens visuels existants ;
- ne pas créer de deuxième système de réservations, clients, paiements ou paramètres si un système adapté existe ;
- vérifier que les règles partagées entre Hôtel et Résidence sont vraiment identiques ;
- centraliser les calculs de durée, tarifs, disponibilité et solde ;
- valider les règles côté serveur ;
- employer des migrations non destructives ;
- protéger les données de chaque établissement ;
- tester sur une base locale isolée ;
- ne pas pousser ni déployer sans autorisation.

### Protection de la base
Le contexte antérieur a signalé que `DATABASE_URL` pouvait pointer vers une base Supabase distante utilisée en production. Avant toute commande de test, migration, seed ou nettoyage :
1. vérifier l’environnement réellement utilisé sans divulguer les secrets ;
2. confirmer que la base ciblée est locale ou autorisée ;
3. isoler les données de test ;
4. examiner l’impact de la migration ;
5. vérifier les sauvegardes et la procédure de restauration.

Ne jamais utiliser la base distante de production pour des tests non autorisés.

---

## 24. Tests d’acceptation

### Logements et tarifs
- créer une chambre et un appartement ;
- définir des tarifs distincts ;
- modifier un tarif sans changer les anciennes réservations ;
- archiver un logement avec historique ;
- vérifier les différents statuts.

### Réservations et disponibilité
- créer une réservation pour chaque durée prise en charge ;
- refuser les chevauchements ;
- autoriser les créneaux contigus lorsque la règle le permet ;
- tester deux réservations simultanées ;
- vérifier annulation, prolongation et départ anticipé ;
- vérifier les limites entre jours et nuits.

### Arrivée / départ
- démarrer une location sans réservation préalable ;
- vérifier la disponibilité côté serveur ;
- enregistrer l’arrivée et la fin prévue ;
- prolonger sans chevauchement ;
- enregistrer le départ réel ;
- distinguer logement libre et logement à nettoyer.

### Finances
- acompte ;
- paiement partiel ;
- paiement complet ;
- solde restant ;
- plusieurs moyens de paiement ;
- annulation/contrepassation tracée ;
- reçus cohérents avec les montants réellement enregistrés ;
- recettes et dépenses sans double comptage.

### Données et permissions
- isolation entre organisations ;
- accès refusé aux documents privés non autorisés ;
- vérification des permissions côté serveur ;
- historique des changements ;
- absence de données client privées dans les vues publiques.

### Hors ligne
- création locale et synchronisation ;
- coupure et reprise ;
- prévention des doublons ;
- résolution de conflits ;
- états d’attente clairement affichés ;
- aucune fausse confirmation de paiement.

### Qualité
- tests unitaires et intégration ;
- vérification TypeScript et lint ;
- interface mobile et ordinateur ;
- impression des documents ;
- test de restauration ;
- tests de non-régression sur les réservations déjà existantes.

---

## 25. Décisions ouvertes à inscrire dans le registre maître

1. Nom exact du mode dans le sélecteur.
2. Activation simultanée des modes par abonnement.
3. Types de durée disponibles au lancement : heures, nuits, jours, semaines, mois.
4. Règles d’arrondi, retard, prolongation et départ anticipé.
5. Politique d’identification des clients par chambre et appartement.
6. Politique de caution/dépôt et de remboursement, si applicable.
7. Moment où un logement redevient réservable après départ.
8. Statut et workflow du ménage.
9. Rôles définitifs.
10. Modèles de documents à livrer en première version.
11. Prix, limites et règles d’abonnement Résidence.
12. Opérations permises hors ligne.
13. Notifications et intégrations externes.
14. Classification réglementaire de l’établissement et obligations applicables au Sénégal.

---

## 26. Ordre de travail conseillé

### Phase A — Audit
- inspecter l’écran d’accueil et le tableau de bord existants ;
- examiner les modèles clients, logements, tarifs et réservations ;
- confirmer la logique de disponibilité ;
- inspecter paiements, dépenses, paramètres, permissions et documents ;
- confirmer l’environnement de base de données.

### Phase B — Socle Résidence
- sélection du mode et navigation ;
- logements ;
- tarifs et durées ;
- clients ;
- réservations et calendrier ;
- arrivée directe ;
- séjours en cours et départs.

### Phase C — Finance et documents
- paiements, acomptes et soldes ;
- dépenses ;
- reçus et rapports ;
- historique et sécurité.

### Phase D — Exploitation
- ménage / maintenance si validés ;
- alertes et notifications ;
- bibliothèque de documents ;
- mode hors ligne selon l’architecture existante.

### Phase E — Validation
- tests locaux ciblés ;
- tests de concurrence et de non-régression ;
- vérification mobile/ordinateur ;
- vérification des documents et rapports ;
- aucune publication sans autorisation explicite.

Cet ordre est une recommandation de planification, pas une autorisation de modifier le code.

---

## 27. Instruction à conserver pour tout futur travail

> Avant de coder la section Résidence, relire ce document et le registre maître SAMA HOME, puis inspecter le dépôt réel. Distinguer les décisions confirmées, les recommandations et les points à décider. Ne pas inventer de fichiers, de fonctions, de modèles, de commandes ou de résultats de tests. Ne pas modifier la base distante de production, ne pas pousser sur GitHub et ne pas déployer sans autorisation explicite. Réutiliser les systèmes existants lorsqu’ils sont adaptés, centraliser les règles métier, préserver les données et tester localement avant de poursuivre.
