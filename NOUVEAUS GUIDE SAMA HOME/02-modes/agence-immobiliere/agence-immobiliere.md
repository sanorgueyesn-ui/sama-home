# SAMA HOME — Référence complète de la section Agence immobilière

**Fichier de référence fonctionnelle et technique — version de travail**  
**Périmètre :** module Agence immobilière dans SAMA HOME, destiné notamment au marché sénégalais.  
**Objectif :** rassembler les décisions déjà confirmées, les exigences fonctionnelles, les recommandations issues de recherches et les points qui restent à arbitrer avant développement.  
**Voir aussi :** [index](../../README.md) · [guide général](../../00-guide-general.md) · [écarts avec le code](../../03-etat-reel-et-ecarts.md) · [décisions ouvertes](../../04-decisions-ouvertes.md) · maquette : `maquette-dashboard.png`  
**Note maquette :** elle ne couvre que la gestion locative (biens, contrats, échéances). Mandats, annonces, propriétaires, visites et reversements n'y figurent pas.

> **Règle de lecture**
> - **CONFIRMÉ** : décision explicitement donnée ou validée dans les échanges précédents.
> - **RECOMMANDATION** : proposition utile à examiner, non considérée comme déjà approuvée.
> - **À CONFIRMER** : décision produit, juridique ou commerciale qui doit être prise avant de figer le comportement.
> - **À VÉRIFIER DANS LE CODE** : ne pas supposer que la fonctionnalité existe déjà. Examiner le dépôt actuel avant de la créer ou la modifier.

---

## 1. Vision produit et décisions confirmées

### 1.1 Une seule application, trois modes métier

**CONFIRMÉ**
SAMA HOME doit rester **une seule application proposant trois modes métier** :
1. **Résidence / chambres et appartements meublés**
2. **Hôtel** — gestion hôtelière complète
3. **Agence immobilière** — transactions immobilières **et** gestion locative

Ce ne sont pas trois applications séparées. Le choix du mode doit déterminer les fonctions métier et l’expérience d’accueil adaptées, sans dupliquer inutilement l’application.

**CONFIRMÉ**
- Construire les sections Hôtel et Agence immobilière, puis les tester localement.
- Les publier ensemble seulement après les tests locaux et avec l’autorisation de l’utilisateur.
- Ne pas modifier le code ni publier de changements sans autorisation explicite.
- Ne pas pousser sur GitHub avant validation locale : le dépôt est relié à un déploiement automatique.
- Le mode hors ligne est attendu sur ordinateur ; le web mobile doit fonctionner en ligne.
- Windows et macOS sont les plateformes ordinateur visées.

**À VÉRIFIER DANS LE CODE**
La structure réelle des modes, le mécanisme de sélection, les permissions, les routes, les modèles Prisma, les migrations, les tests, les stratégies hors ligne et le déploiement. Ces objectifs ne prouvent pas qu’ils sont déjà implémentés.

### 1.2 Public visé

**RECOMMANDATION**
Concevoir le module pour :
- agences immobilières indépendantes ;
- petites et moyennes agences avec plusieurs agents ;
- gestionnaires locatifs travaillant pour plusieurs propriétaires ;
- agences qui font à la fois location, vente et gestion des loyers ;
- structures ayant des immeubles, des villas, des appartements, des chambres, des locaux commerciaux, des terrains ou des lots.

Le produit doit être simple à utiliser pour une agence qui gère encore une partie de ses opérations par cahier, Excel et WhatsApp.

### 1.3 Principes de conception

- Interface en français en premier, avec structure prête pour l’anglais et le wolof si la localisation globale SAMA HOME le permet.
- Montants en FCFA/XOF par défaut, sans bloquer une évolution multi-devise.
- Fuseau métier à configurer ; Dakar/Africa-Dakar est le contexte régional, mais il faut suivre le paramétrage de l’application.
- Interface lisible sur téléphone et ordinateur ; tableaux qui restent utilisables sur petit écran.
- Pas de chiffres, de propriétaires, de loyers, de transactions ou d’annonces fictifs présentés comme de vraies données.
- Les actions financières et juridiques importantes doivent être explicites, traçables et confirmées.
- Ne pas afficher publiquement des informations privées par défaut : téléphone, identité, adresse précise, documents, loyers ou coordonnées bancaires.
- Les règles importantes doivent être centralisées dans les paramètres plutôt que dispersées dans le code.

---

## 2. Écran d’accueil et choix du mode

### 2.1 Accueil Agence immobilière

**CONFIRMÉ — principe général**
L’accueil Agence doit s’inspirer de la qualité visuelle de l’écran d’accueil déjà travaillé pour Hôtel, mais présenter clairement le métier immobilier. L’image d’arrière-plan doit être adaptée à l’immobilier : immeuble moderne, résidence, villa ou ensemble immobilier professionnel, avec contraste suffisant pour la lisibilité.

**RECOMMANDATION**
Écran d’accueil possible :
- titre : **« Gérez votre agence immobilière en toute simplicité »** ;
- sous-texte : « Biens, mandats, visites, locations, ventes et loyers dans un seul espace » ;
- accès à l’espace Agence ;
- rappel du mode sélectionné ;
- visuel immobilier professionnel, sans surcharger l’écran ;
- choix du mode accessible pour passer à Résidence ou Hôtel selon les droits et la configuration du compte.

Ne pas confondre cet écran d’accueil de présentation avec le tableau de bord opérationnel après connexion.

### 2.2 Comment passer d’un mode à l’autre

**CONFIRMÉ**
Il s’agit d’une seule application avec trois modes métier.

**RECOMMANDATION**
- Afficher un sélecteur de mode dans les paramètres de l’organisation ou dans le menu du compte.
- Le changement de mode ne doit pas effacer ni convertir automatiquement les données existantes.
- Une agence peut avoir besoin d’un bien loué en longue durée et d’un autre bien exploité en meublé ; le modèle de données doit éviter les duplications inutiles, tout en séparant les workflows métier.
- Ne pas afficher le sélecteur à un utilisateur qui n’a pas les droits nécessaires.
- Prévoir un message clair si un mode n’est pas activé dans l’abonnement.

**À CONFIRMER**
Un même compte d’organisation peut-il activer plusieurs modes simultanément dans son abonnement, ou faut-il choisir un mode principal ? L’objectif d’une application à trois modes est confirmé, mais la règle commerciale d’activation simultanée doit être définie.

---

## 3. Navigation recommandée

La navigation doit être simple, cohérente avec SAMA HOME et adaptée à la fréquence d’utilisation.

**RECOMMANDATION — menu principal Agence**
1. **Accueil**
2. **Biens**
3. **Annonces**
4. **Contacts**
5. **Activité** — visites, demandes et tâches
6. **Locations**
7. **Ventes**
8. **Finances**
9. **Documents**
10. **Rapports**
11. **Menu / Paramètres**

Sur mobile, limiter la barre inférieure aux sections les plus fréquentes et placer les autres dans **Menu**, conformément à la préférence de navigation mobile déjà évoquée pour SAMA HOME. La sélection exacte des onglets mobiles reste à valider.

### Actions rapides possibles
- Ajouter un bien
- Créer un mandat
- Publier une annonce
- Ajouter un prospect
- Programmer une visite
- Créer un bail / démarrer une location
- Enregistrer un paiement
- Préparer un reversement propriétaire
- Enregistrer une dépense
- Enregistrer une offre d’achat

Ces actions doivent être affichées selon les permissions de l’utilisateur.

---

## 4. Tableau de bord Agence

Le tableau de bord doit répondre immédiatement à cinq questions :
1. Combien de biens l’agence gère-t-elle ?
2. Quels biens sont disponibles, occupés, en vente ou en location ?
3. Quelles demandes, visites et transactions nécessitent une action ?
4. Quels loyers sont reçus, en retard ou encore à recevoir ?
5. Combien l’agence a-t-elle encaissé, dépensé, retenu en commission et reversé aux propriétaires ?

### 4.1 Cartes de synthèse

**RECOMMANDATION**
- Biens sous gestion
- Annonces actives — compteur distinct du nombre de biens sous gestion
- Biens disponibles
- Biens occupés / loués
- Mandats à renouveler ou expirant bientôt
- Visites du jour et de la semaine
- Prospects à relancer
- Loyers attendus
- Loyers encaissés
- Impayés / retards
- Reversements propriétaires à valider
- Commissions d’agence générées
- Dépenses du mois
- Transactions en cours

Ne pas afficher toutes ces cartes en même temps si cela rend le tableau de bord trop dense. Les priorités peuvent varier selon le rôle.

### 4.2 Listes de travail

- Prochaines visites
- Prospects sans suivi récent
- Mandats proches de l’expiration
- Baux proches de l’échéance
- Loyers en retard
- Paiements à rapprocher ou à vérifier
- Reversements à préparer ou à approuver
- Offres et transactions qui attendent une décision
- Annonces expirées ou nécessitant une mise à jour
- Tâches assignées à l’utilisateur connecté

### 4.3 Règles de calcul

**À VÉRIFIER DANS LE CODE / À CONFIRMER**
- Définition exacte d’un bien « sous gestion » : mandat actif, contrat de gestion valide, ou autre statut.
- Définition d’une annonce « active » : publiée, visible, non expirée et rattachée à un bien autorisé.
- Les biens vacants et les annonces ne doivent pas être comptés comme une seule et même chose.
- Les loyers attendus, encaissés et impayés doivent être calculés à partir des échéances et paiements, pas de champs de total modifiés manuellement.
- Les commissions d’agence, montants détenus pour les propriétaires et revenus propres de l’agence doivent être séparés.

---

## 5. Gestion du portefeuille immobilier

### 5.1 Structure des données

**RECOMMANDATION**
Prévoir une hiérarchie qui peut représenter :
- un immeuble, une résidence ou un ensemble immobilier ;
- un bien autonome (villa, maison, appartement, terrain, local commercial, chambre, bureau, entrepôt, lot) ;
- des lots/unités rattachés à un immeuble ;
- plusieurs propriétaires ou copropriétaires, si le besoin métier le justifie.

Un bien peut être suivi par l’agence sans être nécessairement publié en annonce.

### 5.2 Fiche détaillée du bien

Champs à examiner :
- référence interne unique ;
- type de bien ;
- titre et description ;
- adresse et localisation (région, ville, quartier) ;
- adresse exacte et coordonnées, privées par défaut ;
- propriétaire(s) et parts éventuelles ;
- agent responsable ;
- statut de gestion ;
- statut d’occupation ;
- disponibilité ;
- surface, nombre de pièces/chambres, salles d’eau, étage, parking et caractéristiques utiles ;
- photos, vidéos et pièces jointes ;
- prix demandé à la vente ;
- loyer demandé et périodicité ;
- charges éventuelles ;
- date de disponibilité ;
- mandat(s) et dates de validité ;
- historique des annonces, visites, offres, contrats, paiements, charges et interventions ;
- notes internes et historique des modifications.

Ne rendre obligatoires que les champs réellement nécessaires à la création du type de bien choisi. Ne pas supposer que tous les champs doivent être renseignés pour chaque bien.

### 5.3 Statuts distincts

**RECOMMANDATION**
Éviter un seul statut fourre-tout. Séparer :
- **Gestion** : prospecté, mandat en préparation, sous mandat, mandat expiré, clôturé.
- **Occupation** : vacant, occupé, réservé / dossier en cours, indisponible.
- **Commercialisation** : non publié, brouillon, publié, suspendu, expiré, retiré.
- **Transaction** : aucun dossier, visite, offre, négociation, compromis/accord, finalisé, abandonné.

Les statuts définitifs et transitions doivent être définis avec le modèle métier existant.

### 5.4 Historique et suppression

- Garder un historique des changements de statut, de prix, de propriétaire, de mandat et d’occupation.
- Privilégier l’archivage à la suppression définitive lorsqu’un bien a des contrats, paiements ou documents associés.
- Refuser ou guider la suppression d’un bien utilisé dans un bail, une transaction ou une écriture financière.
- Conserver les pièces nécessaires aux obligations contractuelles et comptables, selon une durée de conservation qui devra être validée.

---

## 6. Propriétaires et mandats

### 6.1 Fiche propriétaire

- nom / raison sociale ;
- coordonnées et moyen de contact préféré ;
- adresse de correspondance ;
- pièces justificatives nécessaires, si autorisées et justifiées ;
- biens associés ;
- modalités de gestion ;
- commission de l’agence ;
- coordonnées de reversement, avec accès limité ;
- relevés de gérance et historique des reversements ;
- documents et notes ;
- préférences de communication.

Les documents d’identité et coordonnées financières doivent être protégés par des permissions strictes. Éviter de les exposer aux agents qui n’en ont pas besoin.

### 6.2 Mandats

**RECOMMANDATION**
Types de mandat à envisager :
- mandat de vente ;
- mandat de location ;
- mandat de gestion locative ;
- mandat exclusif ou non exclusif, si pertinent pour les pratiques de l’agence.

Données à gérer :
- propriétaire mandant ;
- biens couverts ;
- type de mandat ;
- date de début et de fin ;
- conditions et taux/montant de commission ;
- exclusivité, si applicable ;
- obligations de l’agence ;
- documents associés ;
- statut de signature ;
- renouvellement, suspension et résiliation ;
- alertes d’échéance.

Un mandat expiré ne doit pas automatiquement autoriser une nouvelle publication ou une nouvelle transaction sans règle métier explicite.

**À CONFIRMER**
Le système doit-il générer des modèles de mandat personnalisables dans la première version, ou seulement joindre et archiver les documents déjà signés ?

---

## 7. Annonces et vitrine immobilière

### 7.1 Différence entre bien et annonce

**IMPORTANT**
- Un **bien** est un élément du portefeuille.
- Une **annonce** est une présentation commerciale du bien, avec son propre statut et sa propre durée de publication.
- Un bien peut être sous gestion sans annonce active.
- Un bien peut avoir besoin de plusieurs annonces au fil du temps, mais la règle de publication simultanée doit être décidée.

Cette séparation est nécessaire pour les compteurs d’abonnement : **le nombre de biens sous gestion et le nombre d’annonces actives sont deux compteurs distincts**.

### 7.2 Contenu d’une annonce

- titre ;
- description publique ;
- type d’opération : louer, vendre, éventuellement louer meublé ;
- prix affiché ;
- caractéristiques du bien ;
- photos ordonnées ;
- quartier et localisation publique ;
- disponibilité ;
- informations sur les frais, si autorisées et configurées ;
- contact / formulaire de demande ;
- date de publication et expiration ;
- statut et motif de retrait.

### 7.3 Publication et confidentialité

**RECOMMANDATION**
- Prévisualiser l’annonce avant publication.
- Vérifier le mandat et le statut de disponibilité avant publication.
- Ne pas exposer automatiquement le nom du propriétaire, ses coordonnées, l’adresse exacte ou des documents.
- Permettre de masquer l’adresse précise et d’afficher seulement le quartier.
- Contrôler les formats et tailles des images.
- Détecter les annonces expirées, les doublons évidents et les annonces d’un bien déjà loué/vendu.
- Journaliser les publications et retraits.

**À CONFIRMER**
La vitrine publique est-elle prévue dès la première version ou seulement la gestion interne des annonces ? La limite d’annonces actives est évoquée comme règle d’abonnement, mais la forme exacte de la vitrine publique reste à valider.

---

## 8. Contacts, prospects et CRM

### 8.1 Types de contacts

- propriétaire ;
- locataire ;
- candidat locataire ;
- acheteur potentiel ;
- vendeur ;
- prospect général ;
- garant ;
- prestataire ;
- notaire ou autre intervenant, si utile.

Une même personne peut avoir plusieurs rôles. Éviter de créer plusieurs fiches identiques pour une personne qui est à la fois propriétaire et acheteur.

### 8.2 Fiche contact

- identité / nom ;
- téléphone et canaux de contact ;
- e-mail facultatif ;
- rôle(s) ;
- besoin immobilier ;
- budget et zone recherchée, si fournis ;
- critères de recherche ;
- biens consultés ;
- visites ;
- offres ;
- historique des échanges ;
- prochaines actions et rappels ;
- consentements ou préférences de communication si nécessaires.

### 8.3 Pipeline de prospection

**RECOMMANDATION**
Statuts possibles :
Nouveau → À contacter → Qualifié → Visite programmée → Offre / dossier → Converti → Perdu.

Pour un prospect perdu, proposer un motif (budget, zone, indisponibilité, absence de réponse, autre), sans rendre tous les motifs obligatoires.

### 8.4 Rappels

- visite à confirmer ;
- prospect à rappeler ;
- document manquant ;
- annonce à mettre à jour ;
- offre en attente ;
- contrat à signer.

**À CONFIRMER**
Les notifications WhatsApp/SMS automatiques, leur coût, les intégrations disponibles et les messages qui peuvent être envoyés sans validation manuelle. Ne pas présenter une intégration comme existante avant vérification.

---

## 9. Visites

Fonctions à prévoir :
- planifier date, heure, durée et lieu de rendez-vous ;
- lier la visite au bien, au prospect et à l’agent ;
- gérer les conflits d’agenda ;
- confirmer, reprogrammer, annuler ou marquer la visite comme effectuée ;
- consigner le retour du prospect ;
- créer une tâche de suivi ;
- garder l’historique des visites.

**RECOMMANDATION**
Statuts : demandée, à confirmer, confirmée, effectuée, annulée, absent.

Prévoir un rappel, mais laisser la configuration des notifications et de leur canal dans les paramètres.

**À CONFIRMER**
L’agenda partagé des agents est-il requis dès la première version ?

---

## 10. Transactions de vente

### 10.1 Dossier de vente

- bien concerné ;
- vendeur / propriétaire ;
- acquéreur potentiel ;
- agent responsable ;
- mandat de vente ;
- prix demandé ;
- offre(s) reçue(s) ;
- négociation et historique des propositions ;
- documents ;
- frais et commission selon l’accord ;
- étapes du dossier ;
- dates importantes ;
- statut final et motif d’abandon.

### 10.2 Pipeline recommandé

Prospect → Visite → Offre reçue → Négociation → Accord de principe → Documents / formalités → Vente finalisée ou abandonnée.

Les termes « compromis », « promesse », « acte » ou autres termes juridiques ne doivent pas être générés automatiquement comme si le logiciel fournissait un conseil juridique. Les étapes exactes et documents doivent être configurables selon la procédure validée par un professionnel.

### 10.3 Paiements et commission de vente

- enregistrer le montant prévu, le montant reçu et le solde ;
- distinguer le prix du bien, les fonds encaissés pour un tiers et la commission acquise par l’agence ;
- définir le bénéficiaire et la justification de chaque mouvement ;
- produire un reçu ou justificatif correspondant à l’opération réelle ;
- ne pas marquer une vente comme finalisée sur la seule base d’une visite ou d’une offre.

**À CONFIRMER**
Le module doit-il gérer seulement le suivi de la transaction et de la commission, ou également des échéanciers de paiement et des fonds détenus pour le compte des parties ? Les fonds de tiers nécessitent des règles comptables, juridiques et de contrôle plus strictes.

---

## 11. Gestion locative

### 11.1 Contrat / bail

Données à gérer selon le modèle contractuel validé :
- bien loué ;
- bailleur / propriétaire ;
- locataire(s) et garant(s), si applicable ;
- date de début et fin ;
- montant du loyer ;
- périodicité ;
- échéance de paiement ;
- dépôt de garantie / caution et état de remboursement ;
- charges récupérables ou non, selon le contrat ;
- commission ou frais d’agence ;
- documents signés ;
- état des lieux d’entrée et de sortie ;
- renouvellement, avenant, congé ou clôture ;
- historique des modifications.

**RECOMMANDATION**
Permettre des baux nus et meublés, des colocataires ou co-titulaires si le modèle métier l’exige, et des renouvellements manuels ou assistés. Ne pas activer une automatisation de renouvellement sans confirmation de la règle juridique et contractuelle.

### 11.2 Échéancier des loyers

À partir du bail, produire un calendrier prévisionnel des échéances :
- période concernée ;
- montant attendu ;
- date d’échéance ;
- paiement(s) enregistré(s) ;
- solde ;
- retard éventuel ;
- frais/charges distincts du loyer ;
- statut : à venir, partiel, payé, en retard, contesté/à vérifier.

Les paiements partiels, avances, trop-perçus, arriérés et régularisations doivent être représentés correctement. Une échéance payée ne doit pas être recréée à chaque ouverture de page.

### 11.3 Quittances et reçus

- Générer une quittance seulement selon les règles validées et le paiement réellement enregistré.
- Un reçu d’encaissement et une quittance de loyer ne sont pas nécessairement le même document.
- Gérer les paiements partiels avec un justificatif approprié, sans certifier que la totalité du loyer est payée.
- Afficher période, locataire, bien, montant reçu, date, moyen de paiement et solde restant si pertinent.
- Permettre PDF et impression.
- Conserver une copie dans le dossier du bail et de la transaction financière.

### 11.4 Impayés et relances

- vue des échéances en retard ;
- montant restant dû par locataire, bien et période ;
- historique des relances ;
- promesse de paiement et prochaine date de suivi ;
- suspension d’une relance après paiement vérifié ;
- export du relevé des impayés.

Les pénalités ne doivent pas être appliquées automatiquement sans règle contractuelle et juridique validée. Les relances doivent rester professionnelles et ne pas constituer une menace juridique automatique.

### 11.5 Sortie du locataire

- notification / date de départ selon le contrat ;
- état des lieux de sortie ;
- soldes de loyers et charges ;
- dépôt de garantie : retenues justifiées et remboursement ;
- remise des clés, si suivie ;
- clôture du bail ;
- libération du bien et mise à jour de sa disponibilité.

Ne pas réutiliser la logique de check-in/check-out hôtel telle quelle pour un bail de longue durée : ce sont des workflows distincts. Les composants communs peuvent être partagés uniquement si leur comportement est réellement identique.

---

## 12. Encaissements, caisse et moyens de paiement

### 12.1 Moyens à enregistrer

**CONFIRMÉ DANS LE CONTEXTE DU MARCHÉ**
L’application doit pouvoir enregistrer des paiements par :
- espèces ;
- Wave ;
- Orange Money ;
- virement bancaire.

Ce point concerne l’enregistrement du moyen de paiement. **Il ne confirme pas l’existence d’une API Wave ou Orange Money, d’un encaissement automatique ou d’une intégration bancaire.**

### 12.2 Écriture d’encaissement

Chaque opération devrait contenir :
- identifiant unique ;
- date et utilisateur ;
- montant ;
- devise ;
- moyen de paiement ;
- référence ou preuve si disponible ;
- objet du paiement : loyer, caution, commission, frais, vente ou autre ;
- payeur ;
- bénéficiaire économique ;
- bien et contrat/dossier associé ;
- statut : saisi, à vérifier, confirmé, annulé/contrepassé ;
- reçu lié.

### 12.3 Corrections et annulations

**RECOMMANDATION FORTE**
- Ne pas supprimer silencieusement un paiement déjà comptabilisé.
- Utiliser une annulation / contrepassation tracée, avec motif et utilisateur.
- Journaliser les modifications sensibles.
- Protéger contre les doublons.
- Séparer les fonds appartenant au propriétaire de la recette propre de l’agence.

### 12.4 Caisse

À envisager si l’agence encaisse des espèces :
- ouverture de caisse par utilisateur ;
- solde d’ouverture ;
- encaissements et décaissements ;
- justificatifs ;
- comptage et clôture ;
- écarts à expliquer ;
- rapport de caisse exportable.

**À CONFIRMER**
La caisse par session est-elle requise au lancement ou peut-elle être livrée après le socle d’encaissement ?

---

## 13. Commissions et reversements aux propriétaires

### 13.1 Calcul des commissions

La commission peut dépendre :
- du type de mandat ;
- d’un pourcentage ;
- d’un montant fixe ;
- d’une règle spécifique pour la location, la vente ou la gestion mensuelle ;
- d’un accord particulier.

**RECOMMANDATION**
Conserver la règle et sa version au moment de l’opération. Un changement de taux dans les paramètres ne doit pas recalculer rétroactivement les commissions déjà validées.

### 13.2 Compte propriétaire / relevé de gérance

Pour chaque propriétaire et période, afficher :
- loyers encaissés pour son compte ;
- paiements partiels et arriérés ;
- dépenses déduites, avec justificatifs ;
- commission de gestion ;
- autres frais prévus par le mandat ;
- montant net à reverser ;
- reversements déjà effectués ;
- solde restant ;
- références et preuves de paiement.

### 13.3 Reversement

Cycle recommandé :
1. consolider les encaissements et dépenses de la période ;
2. calculer les commissions selon le mandat ;
3. vérifier les opérations et justificatifs ;
4. préparer le relevé de gérance ;
5. soumettre le reversement à approbation selon les permissions ;
6. enregistrer le paiement et sa preuve ;
7. générer le relevé final ;
8. garder une trace d’audit.

Ne pas considérer une somme comme reversée tant que l’opération n’est pas réellement enregistrée comme effectuée.

### 13.4 Séparation financière indispensable

Distinguer au minimum :
- argent reçu pour le propriétaire ;
- argent dû au locataire ou au propriétaire ;
- commission acquise par l’agence ;
- frais remboursables ;
- dépenses payées par l’agence ;
- dépôt de garantie / caution ;
- sommes contestées ou à rapprocher.

Les rapports ne doivent pas additionner les loyers encaissés pour des tiers aux revenus propres de l’agence comme s’il s’agissait de la même chose.

---

## 14. Dépenses, charges et travaux

Dépenses possibles :
- réparation ;
- entretien ;
- ménage ;
- eau, électricité et autres charges ;
- frais administratifs ;
- honoraires ;
- publicité ;
- transport ;
- dépenses propres à l’agence ;
- dépenses imputables à un bien ou à un propriétaire.

Champs :
- catégorie ;
- montant ;
- date ;
- mode de paiement ;
- fournisseur / bénéficiaire ;
- bien, propriétaire, bail ou dossier associé ;
- payeur économique ;
- pièce justificative ;
- remboursement attendu ou non ;
- validation et historique.

**RECOMMANDATION**
Différencier les dépenses de l’agence de celles engagées pour le compte du propriétaire. Prévoir une approbation au-delà d’un seuil configurable, si le modèle d’agence le nécessite.

---

## 15. Documents et bibliothèque PDF

Documents à considérer :
- mandat ;
- bail et avenant ;
- fiche du bien ;
- dossier propriétaire ;
- dossier locataire ;
- état des lieux ;
- reçu ;
- quittance ;
- relevé de gérance ;
- relevé d’impayés ;
- preuve de reversement ;
- facture de dépense ;
- dossier de vente ;
- offre et pièces de transaction ;
- rapport mensuel et rapport de caisse.

### Règles
- Modèles personnalisables avec identité de l’agence.
- Génération PDF seulement avec les données réelles et vérifiées.
- Numéro de document unique, daté et traçable.
- Aperçu avant impression ou envoi.
- Archivage dans le bon dossier.
- Permissions de lecture et de téléchargement.
- Gestion des versions des modèles.
- Préserver les documents déjà émis, même si le modèle est modifié plus tard.
- Ne pas apposer de signature électronique ou mention de conformité si le mécanisme correspondant n’est pas réellement en place.

**À VÉRIFIER DANS LE CODE**
Le stockage S3 compatible a fait l’objet d’un test d’intégration rapporté comme réussi dans le projet, mais il faut vérifier les usages réels, les politiques d’accès, les limites de taille, la suppression, les sauvegardes et la bibliothèque de documents avant de s’appuyer dessus pour cette section.

---

## 16. Rapports et indicateurs

### Rapports opérationnels
- inventaire du portefeuille ;
- biens vacants / occupés ;
- mandats actifs et expirés ;
- annonces actives et expirées ;
- visites et conversion ;
- prospects par statut ;
- transactions ouvertes et conclues ;
- baux en cours et arrivant à échéance ;
- échéances à venir ;
- loyers payés, partiels et impayés ;
- dépenses par bien et par période ;
- reversements par propriétaire ;
- commissions générées et encaissées.

### Rapports financiers
- encaissements par moyen de paiement ;
- dépenses ;
- solde de caisse, si la caisse est activée ;
- relevé de gérance par propriétaire ;
- argent détenu pour les propriétaires ;
- commissions propres de l’agence ;
- rapprochements et opérations à vérifier ;
- clôture mensuelle.

### Exports
PDF, impression et tableur/CSV peuvent être utiles, sous réserve de l’architecture existante et de la sécurité des données exportées.

**Règle de fiabilité**
Chaque rapport doit préciser la période, la date de génération et les filtres. Les sommes doivent provenir des écritures sous-jacentes. Ne pas mélanger prévisions, paiements saisis et paiements confirmés.

---

## 17. Utilisateurs, rôles et permissions

**RECOMMANDATION**
Rôles possibles :
- **Administrateur / gérant** : configuration et accès global selon l’organisation ;
- **Responsable d’agence** : supervision des opérations et validations ;
- **Agent commercial** : biens, prospects, annonces et visites selon autorisation ;
- **Gestionnaire locatif** : baux, échéances, locataires, charges et relevés selon autorisation ;
- **Caissier / comptable** : encaissements, dépenses, caisse et rapports financiers autorisés ;
- **Lecture seule / auditeur** : consultation limitée.

Les rôles ci-dessus sont une proposition, pas une confirmation de rôles déjà existants.

### Sécurité
- Contrôles côté serveur sur chaque mutation et lecture sensible.
- Ne pas se fier uniquement au masquage de boutons dans l’interface.
- Cloisonner les données par organisation / compte d’agence.
- Vérifier que chaque document appartient bien à l’organisation autorisée avant de le servir.
- Restreindre l’accès aux données d’identité et de paiement.
- Journaliser les actions financières, les changements de permissions, les exports et les suppressions/archivages.
- Révoquer correctement les sessions et accès.
- Ne pas exposer de secrets ou de données personnelles dans les logs.

**À VÉRIFIER DANS LE CODE**
L’authentification, `verifySession()`, les permissions, l’isolation multi-tenant et l’accès aux fichiers doivent être audités à partir du dépôt actuel. Ne pas présumer que la protection d’une action garantit celle de toutes les autres.

---

## 18. Mode hors ligne et synchronisation

**CONFIRMÉ**
- Mode hors ligne visé sur ordinateur.
- Web mobile utilisé en ligne.
- Windows et macOS prévus.
- Tester localement avant publication.

### 18.1 Principes recommandés
- Définir précisément les données autorisées en cache local.
- Montrer clairement l’état : en ligne, hors ligne, synchronisation en cours, erreur.
- Mettre en file d’attente les opérations hors ligne compatibles.
- Attribuer un identifiant stable à chaque opération pour éviter les doublons à la synchronisation.
- Ne jamais annoncer qu’un paiement ou un reversement est confirmé par le serveur lorsque l’action n’existe encore que localement.
- Définir une politique de conflit pour les modifications concurrentes.
- Afficher les conflits à résoudre sans écraser silencieusement une version.
- Limiter les documents sensibles mis en cache et permettre leur retrait contrôlé.
- Chiffrer les données locales sensibles selon les capacités de la plateforme.
- Prévoir une procédure de reprise après fermeture brutale ou panne.
- Tester les scénarios de connexion instable, de coupure, de reprise et de double synchronisation.

### 18.2 Opérations sensibles hors ligne

**À CONFIRMER**
Les écritures financières, les reversements et les changements de statut juridique doivent-ils être interdits hors ligne, ou autorisés en mode « en attente de synchronisation » avec validation serveur ? Par prudence, ne pas afficher de confirmation définitive avant réception de la confirmation serveur.

### 18.3 Tests obligatoires
- créer/modifier un bien hors ligne puis synchroniser ;
- enregistrer une visite hors ligne ;
- coupure pendant la synchronisation ;
- même opération envoyée deux fois ;
- conflit de modification du même bien ;
- tentative d’action par un utilisateur dont les droits ont été révoqués ;
- document local devenu inaccessible ;
- fermeture/redémarrage avant synchronisation.

Ne pas développer un nouveau moteur offline avant d’avoir inspecté la solution réellement présente et les contraintes de la version ordinateur.

---

## 19. Abonnements et compteurs

### 19.1 Décision confirmée sur la logique de limite

**CONFIRMÉ**
- Les limites du mode Agence doivent être fondées sur le nombre de **biens sous gestion**.
- Le compteur des **annonces actives** doit être séparé du compteur des biens sous gestion.
- Le produit vise le marché sénégalais.
- L’utilisateur a demandé cette réflexion sans modifier le code.

### 19.2 Grille tarifaire discutée — encore à valider

Les prix suivants ont été proposés dans une discussion antérieure, mais **ne doivent pas être traités comme une grille définitivement approuvée** :

| Offre Agence proposée | Prix mensuel proposé | Biens sous gestion proposés | Annonces actives proposées | Comptes utilisateurs proposés |
|---|---:|---:|---:|---:|
| Départ | 9 950 FCFA | 20 | 20 | 3 |
| Croissance | 24 950 FCFA | 100 | 100 | 10 |
| Entreprise | 49 950 FCFA | Illimité | Illimité | Illimité |

**IMPORTANT :** les limites exactes d’annonces et d’utilisateurs dans ce tableau sont des propositions rapportées dans la discussion, à confirmer. Les prix sont des hypothèses commerciales, pas des prix lancés.

### 19.3 Comportement des limites

**RECOMMANDATION**
- Afficher l’usage : `biens sous gestion / limite` et `annonces actives / limite`.
- Avertir avant d’atteindre le plafond.
- Bloquer l’ajout qui dépasserait la limite, sans supprimer ni désactiver automatiquement les données existantes.
- Autoriser l’archivage des biens et la désactivation d’annonces selon des règles claires.
- Définir comment un mandat expiré, un bien archivé, un bien en vente ou un bien dont la gestion est suspendue affecte le compteur.
- Ne pas facturer deux fois un même bien parce qu’il est publié en plusieurs annonces, sauf décision commerciale explicite.
- L’upgrade doit préserver les données et réactiver les capacités conformément au nouvel abonnement.

### 19.4 Points à confirmer avant implémentation
- Grille tarifaire finale ;
- limite réelle d’utilisateurs ;
- essai gratuit et durée ;
- période de grâce après impayé d’abonnement ;
- règles de blocage et d’accès en lecture seule ;
- paiement des abonnements et reçus ;
- gestion de plusieurs modes dans le même abonnement ;
- taxes et règles de facturation applicables.

---

## 20. Paramètres centralisés

Le menu Paramètres devrait centraliser, selon les modules effectivement livrés :
- identité de l’agence, logo et coordonnées ;
- langue et formats ;
- devise et fuseau horaire ;
- types de biens ;
- types et statuts de mandats ;
- statuts d’annonces ;
- modèles de documents ;
- règles de commission par type d’opération ;
- périodicités de loyers ;
- règles d’échéance et de relance ;
- catégories de dépenses ;
- moyens de paiement activés ;
- seuils d’approbation des dépenses ;
- rôles et permissions ;
- règles de notification ;
- numérotation des documents ;
- limites de l’abonnement et compteur d’utilisation ;
- paramètres de confidentialité de la vitrine.

Les paramètres qui affectent les écritures déjà créées doivent être versionnés ou appliqués uniquement aux nouvelles opérations, afin de préserver l’historique.

---

## 21. Points complémentaires à ne pas oublier

Ces fonctions sont des **recommandations à évaluer**, pas des confirmations de périmètre :

### 21.1 États des lieux
- inventaire pièce par pièce ;
- photos datées ;
- état d’entrée et de sortie ;
- observations et réserves ;
- signature ou validation selon un mécanisme réellement supporté ;
- rattachement au bail.

### 21.2 Maintenance et interventions
- demande de réparation ;
- priorité, prestataire et devis ;
- dépenses et justificatifs ;
- statut de l’intervention ;
- rattachement au bien et au propriétaire ;
- validation de la facture.

### 21.3 Assurance, documents et échéances
- dates d’expiration des documents utiles ;
- alertes de renouvellement ;
- suivi des documents manquants ;
- accès réservé aux personnes autorisées.

### 21.4 Détection des doublons
- téléphone normalisé ;
- référence du bien ;
- adresse / localisation ;
- doublons possibles de propriétaires, prospects ou annonces ;
- suggestion de fusion sans fusion automatique irréversible.

### 21.5 Import initial
- import CSV/tableur avec modèle fourni ;
- prévisualisation avant import ;
- validation des champs ;
- rapport d’erreurs ;
- détection des doublons ;
- annulation de l’import si possible avant validation définitive.

### 21.6 Journal d’activité
Conserver qui a fait quoi, quand, sur quel dossier, et le motif lorsque nécessaire. Les événements importants comprennent les changements de mandat, de prix, de statut, les encaissements, les contrepassations, les reversements, les exports et les modifications de permissions.

### 21.7 Sauvegarde et récupération
Définir sauvegardes, restauration testée, rétention et responsabilités. Ne pas présenter une sauvegarde comme fonctionnelle tant qu’une restauration n’a pas été vérifiée.

### 21.8 Recherche et filtres
Recherche globale avec droits respectés, filtres par propriétaire, type, quartier, statut, agent, loyer/prix, disponibilité, mandat, échéance et impayé. Les filtres doivent être utilisables sur mobile.

---

## 22. Cadre juridique sénégalais : précautions produit

Des recherches publiques ont identifié des références sénégalaises sur les activités de transaction et de gestion immobilières, ainsi que des sources secondaires discutant des règles relatives aux baux d’habitation, dépôts de garantie et frais d’agence. Les sources consultées ne sont pas toutes d’autorité égale et certaines résument les règles sans reproduire le texte officiel intégral.

**Conséquence produit :**
1. Ne pas coder en dur un plafond de caution, de frais d’agence, une échéance de paiement ou une pénalité sans vérification juridique actuelle.
2. Ne pas générer des contrats présentés comme juridiquement conformes sans validation par un professionnel compétent au Sénégal.
3. Prévoir des modèles de documents configurables et versionnés.
4. Distinguer une information de gestion interne d’un avis juridique.
5. Conserver les justificatifs et les traces d’opérations.
6. Permettre à l’agence de documenter le mandat, les conditions de commission et l’accord du propriétaire.
7. Faire vérifier les obligations de licence, d’autorisation, de carte professionnelle ou autres exigences applicables à l’activité précise avant le lancement commercial. Les sources publiques retrouvées présentent des informations historiques et des évolutions législatives ; leur articulation doit être confirmée auprès d’une source officielle ou d’un juriste local.

### Sources web consultées
- DIAM POS, fonctionnalités de gestion d’agence immobilière : https://www.diampos.net/produits/immobilier
- Lokativo, gestion immobilière panafricaine : https://lokativo.com/
- NOFLAYE, gestion d’agence et comptabilité locative au Sénégal : https://www.noflaye.sn/
- BIMOLUX, gestion locative et reversements : https://bimolux.com/
- SIM Immobilier, baux, paiements, quittances et portail public : https://sim-immobilier.com/
- Logestimmo, portefeuille, mandats, comptes bailleurs et trésorerie : https://logestimmo.com/
- Vie-Publique.sn, références législatives sur les activités immobilières : https://www.vie-publique.sn/documents/6139/loi-n-1982-07-du-30-juin-1982-relative-aux-activites-de-promotion-et-de-transaction-et-de-gestion-immo-6139
- Vie-Publique.sn, loi relative aux activités de promotion, transaction et gestion immobilières : https://www.vie-publique.sn/documents/5990/loi-relative-aux-activites-de-promotion-de-transaction-et-de-gestion-immobilieres-detude-et-de-conse
- SenPages, synthèse secondaire sur caution et frais d’agence : https://www.senpages.com/dossiers/louer-un-logement/caution-avance-et-frais-dagence

Ces sources servent à élargir la liste des fonctionnalités à examiner. Elles ne prouvent pas que SAMA HOME possède déjà ces fonctionnalités, et les pages commerciales de logiciels concurrents ne sont pas des sources juridiques.

---

## 23. Architecture et intégration au projet existant

### 23.1 Stack connue du projet

Le contexte antérieur mentionne :
- Next.js App Router ;
- React ;
- TypeScript strict ;
- Tailwind CSS ;
- Prisma ;
- PostgreSQL ;
- stockage objet compatible S3 testé précédemment.

**À VÉRIFIER DANS LE CODE**
Versions, schéma actuel, conventions d’architecture, actions serveur, autorisations, tests, stockage et implémentation exacte avant de planifier des fichiers ou migrations.

### 23.2 Règles d’implémentation

- Réutiliser les composants, tokens visuels, systèmes d’authentification et utilitaires déjà présents quand ils sont adaptés.
- Ne pas créer un deuxième système de contacts, documents, paiements ou paramètres s’il en existe déjà un réutilisable.
- Ne pas partager une logique Hôtel avec Agence simplement parce que les noms se ressemblent : vérifier que les règles métier sont identiques.
- Centraliser les règles de calcul et les transitions de statut.
- Valider toutes les données côté serveur.
- Protéger toutes les lectures et écritures par organisation et permission.
- Utiliser des migrations Prisma compatibles avec les données déjà en production.
- Ne jamais tester les migrations destructives sur la base distante de production.
- Ne pas utiliser de données réelles de production pour des essais non autorisés.
- Ne pas pousser ni déployer sans accord explicite.

### 23.3 Protection de la base de données

Le contexte projet a signalé que la variable `DATABASE_URL` pointait vers une base Supabase distante potentiellement utilisée en production. Avant tout test :
1. lire la configuration effective sans exposer de secrets ;
2. confirmer l’environnement ciblé ;
3. vérifier que la base est locale ou explicitement autorisée ;
4. utiliser des données de test isolées ;
5. examiner la migration et les effets possibles ;
6. tester les sauvegardes et la restauration avant toute opération risquée.

Ne pas exécuter une commande de migration, de seed ou de nettoyage avant cette vérification.

---

## 24. Plan de tests d’acceptation

### Portefeuille
- créer chaque type de bien pris en charge ;
- lier un propriétaire ;
- distinguer bien sous gestion et annonce ;
- archiver un bien lié à un historique ;
- vérifier les permissions et l’isolation des données.

### Mandats
- créer un mandat ;
- définir sa période et ses conditions ;
- alerter à l’approche de l’expiration ;
- empêcher les actions interdites après expiration selon la règle validée ;
- préserver les anciennes commissions après modification du paramétrage.

### Annonces et CRM
- publier / suspendre / retirer une annonce ;
- vérifier que l’adresse privée n’est pas exposée par défaut ;
- enregistrer une demande et planifier une visite ;
- empêcher les doublons évidents ;
- vérifier les compteurs de biens et d’annonces séparément.

### Locations
- créer un bail et un échéancier ;
- enregistrer un paiement complet, partiel, une avance et un trop-perçu ;
- calculer correctement le solde ;
- générer le bon justificatif ;
- déclencher une alerte d’impayé sans doubler les échéances ;
- clôturer un bail et traiter la caution selon la règle configurée.

### Finances
- enregistrer espèces, Wave, Orange Money et virement comme moyens de paiement ;
- vérifier qu’aucune intégration API n’est supposée active sans configuration ;
- calculer les commissions ;
- produire un relevé de gérance ;
- préparer puis confirmer un reversement ;
- contrepasser une opération avec motif ;
- distinguer fonds de tiers et recettes de l’agence.

### Vente
- enregistrer plusieurs offres ;
- conserver l’historique des négociations ;
- finaliser ou abandonner une transaction ;
- vérifier la commission et les documents associés.

### Permissions et sécurité
- utilisateur d’une agence A ne peut pas lire les données de l’agence B ;
- agent commercial ne peut pas modifier des paramètres financiers sans droit ;
- accès direct à un fichier privé refusé sans autorisation ;
- actions sensibles journalisées ;
- exports limités aux données autorisées.

### Hors ligne
- opérations compatibles en mode hors ligne ;
- coupure puis reprise ;
- prévention des doublons ;
- résolution de conflits ;
- état « en attente de synchronisation » clairement visible ;
- aucune confirmation financière définitive avant confirmation serveur.

### Abonnements
- atteindre le plafond de biens sans atteindre celui des annonces ;
- atteindre le plafond d’annonces sans atteindre celui des biens ;
- blocage explicite et non destructif ;
- changement de forfait sans perte de données.

### Qualité générale
- tests unitaires et d’intégration ;
- vérification TypeScript et lint ;
- tests d’interface sur mobile et ordinateur ;
- vérification des impressions PDF ;
- test de restauration ;
- test complet local avant toute publication.

---

## 25. Décisions ouvertes à inscrire dans le registre maître

Ne pas répondre par supposition. Les décisions suivantes restent à confirmer :
1. Nom exact affiché dans le sélecteur : « Agence immobilière » ou autre.
2. L’activation simultanée des modes dans un seul abonnement.
3. Les rôles et permissions définitifs.
4. La vitrine publique intégrée dès la première version ou plus tard.
5. Les canaux de notification : application, e-mail, SMS, WhatsApp.
6. Les intégrations de paiement réellement prévues, au-delà de l’enregistrement manuel des moyens de paiement.
7. Les règles exactes de commissions et de reversement.
8. Les modèles juridiques de bail et de mandat.
9. Les règles de calcul des biens sous gestion et des annonces actives.
10. Les prix et plafonds finaux des offres.
11. Le niveau d’opérations autorisées hors ligne.
12. Les fonctions de caisse, de maintenance, d’état des lieux et d’import à livrer au lancement.
13. Les formats et obligations de conservation des documents.
14. Les exigences juridiques applicables, à faire valider au Sénégal.

---

## 26. Ordre de travail conseillé

L’ordre suivant est une recommandation, pas une autorisation de commencer les modifications.

### Phase A — Audit ciblé
- examiner l’écran d’accueil et le tableau de bord existants ;
- examiner les modèles de données et les conventions du dépôt ;
- repérer les composants réutilisables ;
- vérifier auth, permissions, documents, paiements, paramètres et stockage ;
- confirmer l’environnement de base de données sans modifier les données.

### Phase B — Socle agence
- mode Agence et navigation ;
- portefeuille de biens ;
- propriétaires et contacts ;
- mandats ;
- compteurs biens sous gestion / annonces actives.

### Phase C — Activité commerciale
- annonces ;
- prospects et visites ;
- pipeline de vente ;
- historique et tâches.

### Phase D — Gestion locative et finances
- baux et échéanciers ;
- paiements et justificatifs ;
- impayés ;
- commissions, relevés et reversements ;
- dépenses et rapports.

### Phase E — Documents, sécurité et mode hors ligne
- bibliothèque documentaire ;
- rôles et journal d’activité ;
- synchronisation hors ligne selon l’architecture réellement disponible ;
- tests de sécurité et de récupération.

### Phase F — Validation
- exécuter les tests locaux ;
- vérifier l’interface sur mobile et ordinateur ;
- faire tester les workflows représentatifs ;
- corriger les régressions ;
- ne publier qu’après autorisation explicite.

---

## 27. Instruction à conserver pour tout futur travail sur ce module

> Avant de coder, lire ce document et le registre maître SAMA HOME, puis inspecter l’état réel du dépôt. Distinguer les décisions confirmées des recommandations et des questions ouvertes. Ne pas inventer de fichiers, de fonctions, de modèles Prisma, de commandes ou de résultats de tests. Ne pas modifier la base distante de production, ne pas pousser sur GitHub et ne pas publier sans autorisation explicite. Réutiliser les systèmes existants lorsqu’ils conviennent, centraliser les règles métier, protéger les données par organisation et permissions, puis tester localement de façon ciblée avant de continuer.
