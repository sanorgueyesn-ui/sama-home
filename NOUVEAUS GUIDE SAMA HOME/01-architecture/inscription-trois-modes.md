# SAMA HOME — Décision d’architecture : inscription et liaison des trois modes

**Statut : décision produit validée, architecture à vérifier dans le dépôt avant implémentation**  
**Périmètre :** inscription, compte utilisateur, espaces professionnels, activation des modes Résidence, Hôtel et Agence immobilière, sélecteur de mode.  
**Règle absolue :** ce document décrit la cible décidée. Il ne signifie pas que ces éléments existent déjà dans le code.  
**Voir aussi :** [index](../README.md) · [guide général](../00-guide-general.md) · [écarts avec le code](../03-etat-reel-et-ecarts.md) (le schéma actuel n'a ni `Membership` ni mode métier : `User.establishmentId` est une clé unique) · [décisions ouvertes](../04-decisions-ouvertes.md)

---

## 1. Décisions retenues

Les choix suivants ont été explicitement confirmés :

1. **Activation des modes :** un seul mode au départ ; l’utilisateur pourra ajouter d’autres modes plus tard depuis les paramètres.
2. **Passage entre les modes :** sélecteur accessible depuis le menu du compte.
3. **Choix du mode :** avant l’inscription, sur la page d’accueil.
4. **Organisation des données :** un compte utilisateur avec un espace professionnel indépendant par activité.

Le produit reste une seule application SAMA HOME avec trois modes :
- Résidence — chambres et appartements meublés ;
- Hôtel ;
- Agence immobilière.

## 2. Décision d’architecture recommandée

### 2.1 Séparer quatre notions

Le système doit distinguer clairement :

**A. Compte utilisateur**
- Identité de connexion de la personne.
- Téléphone ou e-mail et mécanisme d’authentification.
- Peut accéder à un ou plusieurs espaces professionnels selon ses droits.
- Un seul compte peut être associé à plusieurs espaces ; il ne faut pas demander de recréer un compte pour ajouter un mode.

**B. Espace professionnel / organisation**
- Représente une activité ou une entité opérationnelle.
- Possède ses propres données métier, paramètres, utilisateurs autorisés, documents et abonnement.
- Exemple : un espace « Résidence Atlantique » et un espace « Hôtel X » sont distincts, même s’ils appartiennent à la même personne.
- Le nom exact de cette entité dans le modèle de données (`Organization`, `Workspace`, `Business` ou autre) doit suivre les conventions du dépôt existant.

**C. Mode métier**
- Définit l’expérience et les fonctions disponibles : Résidence, Hôtel ou Agence immobilière.
- Le mode est associé à un espace professionnel, pas seulement à l’utilisateur.
- Un espace a un mode principal explicite dans la première version.
- Pour ajouter un autre mode, l’utilisateur crée/active un autre espace professionnel du type souhaité, sans mélanger les données de l’espace existant.

**D. Abonnement / droits d’accès**
- Définit les modes ou espaces autorisés, les limites et les fonctions disponibles.
- Ne doit pas être confondu avec le compte utilisateur ni avec les données métier.
- Les règles tarifaires exactes restent à définir ; aucune grille de prix n’est décidée dans ce document.

### 2.2 Règle de séparation des données

**Décision : chaque espace professionnel a son propre périmètre de données.**

Les réservations, chambres, tarifs, clients, paiements et dépenses d’un espace Résidence ne doivent pas apparaître dans un espace Hôtel ou Agence, sauf partage explicite conçu et autorisé ultérieurement.

Chaque requête, lecture, modification, document, rapport et export doit être limité à l’espace actif et aux permissions de l’utilisateur. Cacher simplement un menu dans l’interface ne suffit pas : la vérification doit être effectuée côté serveur.

### 2.3 Ne pas créer trois applications

- Un seul produit et une seule porte d’entrée.
- Un système commun d’authentification.
- Des espaces professionnels indépendants.
- Une navigation et un tableau de bord adaptés au mode de l’espace actif.
- Des composants partagés seulement lorsqu’ils ont réellement le même comportement métier.
- Pas de duplication forcée de la logique commune, mais pas de fusion artificielle des workflows Hôtel, Résidence et Agence.

---

## 3. Parcours utilisateur cible

### Étape 1 — Page publique SAMA HOME

Présenter simplement les trois activités avec des cartes :
- Hôtel ;
- Résidence / chambres et appartements meublés ;
- Agence immobilière.

Chaque carte explique en une phrase ce que le logiciel aide à gérer.

Action principale : **Choisir mon activité**.

### Étape 2 — Choix du mode avant l’inscription

L’utilisateur choisit le mode correspondant à son activité initiale.

Le choix est conservé pendant le passage à l’inscription afin de ne pas lui demander de le sélectionner une seconde fois.

Prévoir un lien « Changer d’activité » si l’utilisateur s’est trompé.

### Étape 3 — Créer le compte

Demander uniquement les données indispensables à la création du compte, selon les mécanismes d’authentification réellement disponibles :
- nom ou nom d’affichage ;
- téléphone ou adresse e-mail ;
- mot de passe, si l’authentification par mot de passe est utilisée ;
- vérification du contact si elle est implémentée.

Ne pas inventer de vérification par SMS ou e-mail si aucun service correspondant n’est configuré. Ne pas demander les informations complètes de l’établissement avant que cela soit nécessaire.

### Étape 4 — Créer l’espace professionnel initial

Après création/authentification du compte, demander les informations minimales de l’activité choisie :
- nom de l’établissement ou de l’agence ;
- ville ;
- éventuellement les quelques paramètres indispensables au mode.

Créer un espace professionnel indépendant avec le mode sélectionné comme mode principal.

Le processus doit être idempotent : un rafraîchissement ou une nouvelle tentative ne doit pas créer plusieurs espaces identiques.

### Étape 5 — Terminer la configuration essentielle

Afficher une courte checklist adaptée au mode.

**Résidence :**
- ajouter les premiers logements ;
- configurer les tarifs et durées ;
- configurer les règles d’identification des clients ;
- vérifier les moyens de paiement.

**Hôtel :**
- ajouter chambres et appartements ;
- configurer tarifs et durées ;
- vérifier les règles d’arrivée et de départ ;
- configurer les moyens de paiement.

**Agence immobilière :**
- ajouter le premier bien ;
- créer un propriétaire ou contact ;
- configurer le type de mandat et les paramètres commerciaux nécessaires.

La checklist doit être progressive : permettre d’entrer dans l’application avant d’avoir terminé tous les réglages.

### Étape 6 — Arriver sur le tableau de bord

Après la configuration minimale, ouvrir le tableau de bord du mode choisi.

Ne pas afficher dans ce tableau de bord les fonctions métier des deux autres modes. Les options non configurées doivent être présentées comme des tâches de configuration, et non comme des données fictives.

### Étape 7 — Ajouter un autre mode plus tard

Dans le menu du compte ou les paramètres de l’espace, afficher une action claire du type :
**« Ajouter un autre espace professionnel »**.

L’utilisateur choisit ensuite Résidence, Hôtel ou Agence immobilière, saisit le nom de cette nouvelle activité et suit sa configuration initiale.

Avant de créer ce nouvel espace, vérifier les droits de l’utilisateur et les règles de son abonnement. Si l’abonnement ne permet pas encore cet ajout, expliquer la condition requise sans supprimer ni modifier l’espace existant.

Ne pas convertir automatiquement les données de l’espace actuel dans le nouvel espace.

---

## 4. Sélecteur de mode dans le menu du compte

Le sélecteur doit montrer les espaces auxquels la personne a accès, pas une liste globale de tous les modes de SAMA HOME.

Exemple conceptuel :

- Résidence Atlantique — Résidence
- Hôtel Baobab — Hôtel
- ABC Immobilier — Agence immobilière
- **+ Ajouter un espace professionnel**

Au changement d’espace :
1. vérifier côté serveur l’appartenance et les permissions ;
2. mettre à jour l’espace actif ;
3. charger le tableau de bord et la navigation de cet espace ;
4. invalider ou recharger les données mises en cache qui appartiennent à l’espace précédent ;
5. ne jamais laisser visibles les données du précédent espace pendant ou après la transition ;
6. conserver la session utilisateur sans lui imposer une nouvelle connexion, tant que sa session reste valide.

Si l’utilisateur ne possède qu’un seul espace, le sélecteur peut rester discret ou afficher le mode actif avec l’option d’ajouter un espace.

---

## 5. Compte, rôles et invitations

Un compte peut être :
- propriétaire / administrateur de son espace ;
- membre invité dans un autre espace ;
- membre de plusieurs espaces avec des rôles différents.

Cette capacité est une recommandation d’architecture à vérifier par rapport au système actuel. Elle évite de créer un compte distinct pour chaque employeur ou établissement.

### Règles recommandées
- Les rôles sont attribués par espace, pas globalement à tous les espaces de la personne.
- Être administrateur d’un espace ne donne pas automatiquement accès aux autres.
- Une invitation doit viser un compte ou une adresse de contact vérifiée, selon le mécanisme choisi.
- Révoquer l’accès à un espace ne doit pas supprimer le compte ni ses accès légitimes aux autres espaces.
- Les utilisateurs et permissions doivent être vérifiés côté serveur pour chaque action.

---

## 6. Abonnements : décision de séparation

Le compte utilisateur et l’abonnement sont deux notions distinctes.

**Recommandation :** associer les droits et limites à l’espace professionnel ou à une souscription explicitement définie, plutôt que de faire dépendre les droits uniquement du compte de connexion.

Cela permet, si le modèle commercial le prévoit :
- un espace Hôtel avec son propre forfait ;
- un espace Résidence avec son propre forfait ;
- un espace Agence avec son propre forfait.

**À confirmer commercialement :**
- chaque nouvel espace doit-il avoir son propre abonnement ?
- existe-t-il un forfait qui permet plusieurs espaces ?
- les utilisateurs invités sont-ils facturés séparément ?
- comment gérer l’essai gratuit, l’impayé et la période de grâce ?

Ne pas coder ces règles avant validation de la grille tarifaire et de la stratégie commerciale.

---

## 7. Modèle conceptuel indicatif

Ce schéma exprime les relations souhaitées, pas le schéma Prisma actuel.

```text
User (compte de connexion)
  |
  |< membership >|
  |
Workspace / Organization (espace professionnel indépendant)
  |-- businessMode: RESIDENCE | HOTEL | REAL_ESTATE
  |-- settings
  |-- subscription / entitlements
  |-- members and roles
  |-- domain data
        |-- Résidence : logements, tarifs, réservations, séjours
        |-- Hôtel : chambres, réservations, arrivées/départs, opérations hôtelières
        |-- Agence : biens, propriétaires, mandats, annonces, transactions
```

Une relation d’appartenance (membership) doit porter les droits du compte dans chaque espace. Le nom réel des tables, les clés étrangères et les enums doivent être adaptés au dépôt après inspection.

---

## 8. Ce qui est confirmé, décidé et à vérifier

### Confirmé avant cette décision
- SAMA HOME comporte trois modes métier : Résidence, Hôtel et Agence immobilière.
- Il s’agit d’une seule application.
- Les fonctionnalités doivent rester adaptées au métier choisi.
- Les données existantes doivent être préservées lors des mises à jour.
- Les tests locaux doivent précéder toute publication.
- Pas de push GitHub ou de déploiement sans autorisation explicite.

### Décisions validées par l’utilisateur dans cette conversation
- Démarrer avec un seul mode, puis permettre d’ajouter d’autres modes depuis les paramètres.
- Sélecteur de mode dans le menu du compte.
- Choisir le mode avant l’inscription.
- Un compte avec un espace professionnel indépendant par activité.

### À vérifier dans le code avant toute implémentation
- Le modèle actuel `User`, `Session` et toute table d’organisation/espace.
- Si un utilisateur peut déjà appartenir à plusieurs espaces.
- Le mécanisme actuel de choix du mode.
- Les routes d’inscription, connexion et redirection.
- Les contrôles de session et d’autorisation côté serveur.
- La façon dont les modèles métier sont rattachés à une organisation.
- Les filtres multi-tenant de chaque requête.
- Les accès aux fichiers et documents.
- Les caches et données conservées lors du changement d’espace.
- Le système d’abonnement et ses compteurs.
- Les migrations existantes et leur compatibilité.
- La stratégie de test et la configuration réelle de base de données.

Le contexte antérieur signale une base Supabase distante potentiellement utilisée en production. Toute inspection doit éviter de divulguer les secrets et toute migration ou écriture doit cibler une base de test autorisée, jamais la production sans accord explicite.

---

## 9. Critères d’acceptation

Le parcours sera considéré correct lorsque les tests auront démontré que :

1. Un visiteur choisit son mode avant de créer son compte.
2. Le choix du mode est conservé jusqu’à la fin de l’inscription.
3. Une inscription ne crée qu’un compte et qu’un espace initial, même après rafraîchissement ou reprise.
4. L’espace initial est du bon mode et ouvre le bon tableau de bord.
5. L’utilisateur peut ajouter un autre espace si ses droits et son abonnement le permettent.
6. Le sélecteur n’affiche que les espaces autorisés à l’utilisateur.
7. Le changement d’espace ne nécessite pas une nouvelle connexion tant que la session est valide.
8. Aucune donnée d’un espace ne fuit dans un autre via les listes, rapports, recherches, exports, caches ou fichiers.
9. Les rôles sont appliqués indépendamment dans chaque espace.
10. L’accès à un espace révoqué est refusé côté serveur.
11. Un dépassement d’abonnement ne supprime aucune donnée.
12. L’ajout d’un espace ne modifie pas les données des espaces existants.
13. Le parcours reste utilisable sur mobile et ordinateur.
14. Les tests, vérifications TypeScript et lint sont réalisés localement avant toute publication.
15. Aucun déploiement ni push n’a lieu sans autorisation explicite.

---

## 10. Plan d’action recommandé — sans modification à ce stade

1. Lire le registre maître SAMA HOME et les documents `hotel.md`, `residence.md` et `agence-immobiliere.md`.
2. Inspecter le dépôt et relever les modèles, routes, actions serveur et permissions réels.
3. Produire un tableau « existant / manquant / à modifier / risque » pour l’inscription, les espaces, les modes et l’isolation des données.
4. Proposer les changements de modèle et de parcours sans les appliquer.
5. Faire valider les points commerciaux encore ouverts.
6. Implémenter uniquement après autorisation, dans un environnement de test isolé.
7. Tester les inscriptions, changements d’espace, permissions, isolation des données et migrations.
8. Présenter les résultats locaux avant tout push ou déploiement.

**Instruction durable :** ne pas supposer que l’architecture cible est déjà présente. Inspecter d’abord le code réel et la base ciblée. Ne modifier aucun code, ne lancer aucune migration sur la production, ne pousser aucun commit et ne déployer sans autorisation explicite.
