# SAMA HOME --- Guide général du produit et du développement

**Document de référence pour les développeurs, agents IA, designers,
testeurs et responsables techniques**\
**Version :** 1.2 --- 27 octobre 2026 (rangement du dossier, liens
vers l'index [README.md](README.md))\
**Statut :** Vue d'ensemble produit et architecture cible. Ce document
ne prouve pas qu'une fonctionnalité est déjà implémentée et ne remplace
pas l'inspection du dépôt réel.

------------------------------------------------------------------------

## 1. Pourquoi ce document existe

Ce fichier doit permettre à un nouveau développeur ou à un agent IA de
comprendre rapidement ce qu'est SAMA HOME, à quoi le produit sert,
comment ses grandes parties s'articulent et quelles précautions
respecter avant de travailler dessus.

Il constitue le **point d'entrée général** du projet. Pour une tâche
métier précise, il faut ensuite lire la spécification détaillée du mode
concerné et vérifier le code existant.

### Règle de lecture

-   **DÉCISION CONFIRMÉE** : choix produit déjà validé.
-   **OBJECTIF / ARCHITECTURE CIBLE** : capacité souhaitée, qui peut ne
    pas encore être implémentée.
-   **RECOMMANDATION** : proposition technique à évaluer, pas une
    décision définitive.
-   **À VÉRIFIER DANS LE DÉPÔT** : inspecter les fichiers, versions,
    tests et configurations avant d'agir.
-   **À DÉCIDER** : ne pas inventer de règle métier.

Ne jamais présenter une fonction comme terminée uniquement parce qu'elle
figure dans ce document.

------------------------------------------------------------------------

## 2. Qu'est-ce que SAMA HOME ?

SAMA HOME est un logiciel de gestion destiné aux professionnels de
l'hébergement et de l'immobilier. Le produit vise à centraliser, dans
une seule plateforme, les opérations quotidiennes, les informations
clients, les biens gérés, les réservations ou dossiers immobiliers, les
mouvements financiers et les paramètres propres à l'activité.

SAMA HOME n'est pas seulement une page web ou un tableau de bord. Le
produit comprend plusieurs couches qui doivent fonctionner ensemble :

-   une interface utilisateur ;
-   des règles métier ;
-   une authentification et des autorisations ;
-   des espaces professionnels et leurs données ;
-   une couche de persistance ;
-   des services serveur ;
-   des mécanismes de configuration et d'intégration ;
-   une version web et, comme objectif, une version installable sur
    ordinateur avec fonctionnement hors ligne et synchronisation.

La présence et l'état d'avancement de chacune de ces parties doivent
être vérifiés dans le dépôt actuel.

## 3. À quoi sert SAMA HOME ?

Selon l'activité choisie, le produit a vocation à aider les
professionnels à :

-   organiser les chambres, appartements, biens ou unités qu'ils gèrent
    ;
-   gérer les clients et les informations liées à leurs opérations ;
-   suivre les réservations, séjours, locations ou opérations
    immobilières propres à leur activité ;
-   configurer les tarifs et règles opérationnelles lorsque le mode le
    prévoit ;
-   suivre les paiements, acomptes, soldes et dépenses prévus par le
    mode ;
-   consulter un tableau de bord, des rapports et l'historique utile ;
-   organiser le travail de plusieurs utilisateurs avec des droits
    adaptés ;
-   réduire la dépendance aux cahiers, feuilles de calcul et outils
    dispersés ;
-   accéder aux données et aux fonctions autorisées selon le support
    utilisé et la connectivité disponible.

Cette liste décrit le périmètre général visé. Les fonctionnalités
exactes doivent être confirmées dans les documents métier et dans le
code.

------------------------------------------------------------------------

## 4. Les trois modes métier

**DÉCISION CONFIRMÉE :** SAMA HOME est un seul produit comportant trois
modes métier distincts. Il ne faut pas en faire trois applications
indépendantes ni supposer que leurs règles métier sont identiques.

### 4.1 Hôtel

Mode destiné à la gestion d'un établissement hôtelier. Il doit utiliser
un vocabulaire, une navigation et des opérations adaptés à l'activité
hôtelière.

Référence fonctionnelle : `hotel.md` (localiser réellement ce fichier
dans le dépôt).

### 4.2 Résidence / chambres et appartements meublés

Mode destiné à la gestion d'une résidence, de chambres meublées et
d'appartements meublés, avec des durées de location et des règles
propres à cette activité.

Référence fonctionnelle : `residence.md` (localiser réellement ce
fichier dans le dépôt).

### 4.3 Agence immobilière

Mode destiné à une agence immobilière, notamment pour les opérations
immobilières et la gestion locative prévues dans sa spécification.

Référence fonctionnelle : `agence-immobiliere.md` (localiser réellement
ce fichier dans le dépôt).

### 4.4 Séparation entre modes

-   Distinguer les fonctionnalités communes des fonctionnalités propres
    à chaque mode.
-   Ne pas réutiliser automatiquement un flux Hôtel dans Résidence ou
    Agence sans vérifier sa pertinence métier.
-   Ne pas mélanger les données, les paramètres, les droits ou les
    rapports des espaces professionnels.
-   Une modification commune doit être évaluée pour ses effets sur les
    trois modes.
-   Consulter les spécifications du mode concerné avant de créer ou
    modifier une fonction.

------------------------------------------------------------------------

## 5. Comptes et espaces professionnels

**Décisions de conception confirmées :**

1.  L'utilisateur choisit son mode métier avant de s'inscrire.
2.  L'inscription crée un compte et un premier espace professionnel.
3.  Un même compte peut ajouter d'autres modes ultérieurement depuis les
    paramètres, selon les droits et conditions qui seront prévus.
4.  Chaque activité ajoutée correspond à un espace professionnel
    indépendant.
5.  L'utilisateur passe d'un espace à l'autre depuis un sélecteur dans
    le menu du compte.
6.  Les données, paramètres, opérations et autorisations propres à un
    espace doivent rester isolés des autres espaces.
7.  Les autorisations doivent être évaluées dans le contexte de l'espace
    concerné.

Ces décisions décrivent l'architecture produit souhaitée. **Le modèle
réellement présent dans le code doit être inspecté avant toute
modification.** Ne pas supposer que le schéma de base de données ou
l'interface d'inscription implémente déjà entièrement ces décisions.

------------------------------------------------------------------------

## 6. Les grandes parties du logiciel

Les termes suivants décrivent des responsabilités, pas nécessairement
des dossiers ou services séparés dans le dépôt.

### 6.1 Interface / frontend

Les pages, composants, formulaires, tableaux, menus, états d'interface,
navigation et retours visibles par l'utilisateur.

### 6.2 Backend et règles métier

Les traitements côté serveur, validations, contrôles d'accès, règles
métier, calculs et opérations qui doivent être fiables même si
l'interface est contournée.

### 6.3 Données et persistance

Les informations durables : comptes, espaces professionnels, données
métier, opérations et historiques. Le schéma réel, les relations, les
contraintes et les migrations doivent être examinés avant toute
intervention.

### 6.4 Authentification et autorisations

L'identité de l'utilisateur, sa session, son accès à un espace et ses
droits dans cet espace. Masquer un bouton dans l'interface ne remplace
jamais une vérification côté serveur.

### 6.5 Paramètres et intégrations

Les paramètres métier et techniques, les variables d'environnement et
les services externes. Ne jamais exposer les secrets ni afficher leur
contenu dans un rapport.

### 6.6 Tests et qualité

Les tests automatisés, les vérifications TypeScript, le lint et les
contrôles adaptés à la modification. Ne rapporter que les commandes
réellement exécutées et leurs résultats observés.

### 6.7 Hébergement et déploiement

Les services qui rendent la version web accessible. Inspecter la
configuration actuelle avant toute action. Ne jamais présumer qu'un push
GitHub est sans conséquence : le dépôt peut être relié à un déploiement
automatique.

------------------------------------------------------------------------

## 7. Application web et utilisation sur mobile

SAMA HOME possède une application web accessible depuis un navigateur.
L'objectif est de permettre une utilisation adaptée aux ordinateurs,
tablettes et téléphones selon les capacités de l'application.

Le web mobile est prévu pour fonctionner en ligne. Ne pas promettre le
fonctionnement hors ligne sur téléphone sans décision et implémentation
spécifiques.

Le fait qu'une application soit responsive, installable comme raccourci
ou accessible depuis un navigateur ne signifie pas qu'elle dispose d'une
base de données locale complète ni d'une synchronisation fiable.

Les comportements mobiles réellement disponibles doivent être vérifiés
dans le code et testés sur les formats visés.

------------------------------------------------------------------------

## 8. Application installable sur Windows et macOS

**OBJECTIF CONFIRMÉ :** SAMA HOME doit pouvoir être installé et utilisé
sur un ordinateur Windows et sur macOS, y compris lorsque la connexion
Internet est indisponible pour les opérations explicitement prises en
charge.

**À VÉRIFIER / CONCEVOIR :** le dépôt actuel peut être uniquement une
application web. Ne pas conclure qu'un installateur Windows ou macOS, un
paquet desktop ou un mécanisme de mise à jour existe déjà sans l'avoir
vérifié.

L'étude de la version ordinateur doit déterminer :

-   la technologie d'emballage desktop compatible avec l'application
    existante ;
-   les versions de Windows et macOS réellement visées ;
-   les formats d'installation et de distribution ;
-   les permissions système nécessaires ;
-   l'emplacement de stockage local ;
-   la protection des données locales ;
-   les mises à jour de l'application sans effacer les données ;
-   les journaux et mécanismes de diagnostic ;
-   la procédure de sauvegarde et de restauration ;
-   la signature et la distribution des paquets lorsque cela est
    nécessaire.

### 8.1 Principe de conception

Éviter de développer deux logiciels métier indépendants. Dans la mesure
où l'architecture le permet, réutiliser les composants et règles métier
de SAMA HOME Web et limiter les différences desktop aux besoins
spécifiques : intégration système, persistance locale, synchronisation
et distribution.

Cette orientation doit être validée après inspection de l'application
réelle. Aucun framework desktop n'est imposé par ce document.

------------------------------------------------------------------------

## 9. Fonctionnement hors ligne et synchronisation

**OBJECTIF CONFIRMÉ :** sur ordinateur, SAMA HOME doit pouvoir continuer
les opérations autorisées sans Internet, puis synchroniser les
changements lorsque la connexion revient. Les données doivent pouvoir
être partagées avec les autres appareils et utilisateurs selon leurs
droits.

Le mode hors ligne n'est pas équivalent à la simple installation de
l'application.

### 9.1 Architecture cible à étudier

Une approche locale avec synchronisation cloud est une piste
d'architecture à évaluer :

1.  l'application desktop conserve localement les données nécessaires
    aux fonctions autorisées ;
2.  les opérations hors ligne sont enregistrées durablement dans une
    file locale ;
3.  quand Internet revient, l'application envoie les opérations au
    serveur ;
4.  elle récupère ensuite les changements auxquels l'utilisateur a droit
    ;
5.  l'application indique les opérations en attente, synchronisées ou en
    erreur ;
6.  les conflits sont détectés et traités explicitement.

Cette description est une **architecture cible**, pas une preuve
d'implémentation actuelle. Le rapport d'architecture hors ligne et
synchronisation doit être consulté s'il est disponible dans le dépôt.

### 9.2 Points indispensables à définir

-   Quelles fonctions sont utilisables hors ligne et lesquelles
    nécessitent Internet ?
-   Quelles données sont conservées sur chaque ordinateur ?
-   Comment l'accès local est-il protégé ?
-   Comment distinguer une opération créée localement d'une opération
    déjà reçue par le serveur ?
-   Comment réessayer une synchronisation sans créer de doublons ?
-   Comment détecter et résoudre les modifications concurrentes ?
-   Comment éviter les conflits de disponibilité sur une même chambre ou
    un même bien ?
-   Comment gérer les suppressions, les modifications simultanées, les
    erreurs et les comptes révoqués ?
-   Comment afficher l'état de synchronisation à l'utilisateur ?
-   Comment préserver les données lors d'une mise à jour, d'une
    réinstallation ou d'une panne ?
-   Comment tester la perte de réseau, la reconnexion, les doublons et
    les conflits ?

### 9.3 Conflits et opérations sensibles

La synchronisation ne doit pas être conçue comme une simple copie
aveugle de bases de données. Deux appareils peuvent modifier les mêmes
données pendant qu'ils sont déconnectés.

Les règles de résolution doivent être adaptées au domaine métier et
définies avant d'implémenter la synchronisation. En particulier, les
opérations pouvant créer une double réservation ou un conflit financier
exigent des contrôles spécifiques. Ne jamais inventer une stratégie de
résolution sans validation.

### 9.4 Données et mises à jour

-   Une mise à jour du logiciel ne doit jamais effacer silencieusement
    les données locales.
-   Les migrations de schéma local doivent être planifiées, testées et
    réversibles autant que possible.
-   Les sauvegardes, la restauration et les erreurs de synchronisation
    doivent être documentées.
-   Ne jamais tester des scénarios destructifs sur des données de
    production.

------------------------------------------------------------------------

## 10. Principes d'expérience utilisateur

-   L'interface doit rester simple et professionnelle.
-   Les mots, écrans et actions doivent correspondre au mode métier
    sélectionné.
-   Les états, erreurs, confirmations et résultats doivent être
    compréhensibles.
-   Les paramètres métier importants doivent être centralisés lorsque
    cela est prévu.
-   Respecter les décisions UX et l'identité visuelle existantes.
-   Ne pas remplacer une interface validée sans examiner le contexte et
    justifier le changement.
-   La version hors ligne doit rendre l'état de connexion et de
    synchronisation compréhensible.
-   L'expérience doit tenir compte des écrans mobiles et ordinateurs
    effectivement pris en charge.

------------------------------------------------------------------------

## 11. Contexte technique

Le contexte documenté indique une application web utilisant Next.js App
Router, React, TypeScript strict, Prisma et PostgreSQL. Les versions et
la configuration peuvent évoluer.

Avant chaque tâche technique, vérifier dans le dépôt réel :

-   les versions déclarées et verrouillées ;
-   les dépendances réellement installées lorsque c'est pertinent ;
-   les scripts disponibles ;
-   la structure App Router ;
-   le schéma Prisma et les migrations ;
-   la configuration de la base et les environnements ;
-   les tests, règles de lint et vérifications TypeScript ;
-   l'état Git, la branche et les modifications locales ;
-   les consignes du dépôt et les documents existants.

Ne pas lancer de commande sur la seule base de ce résumé. Inspecter
d'abord son objectif, son répertoire d'exécution et ses effets.

------------------------------------------------------------------------

## 12. Sécurité et protection des données

-   Vérifier les sessions et les droits côté serveur.
-   Isoler les données par espace professionnel.
-   Ne pas supposer qu'un rôle dans un espace donne les mêmes droits
    dans un autre.
-   Ne jamais afficher ni copier des secrets dans les rapports.
-   Ne pas effectuer de migration ou de modification destructive de la
    base sans autorisation explicite.
-   Traiter la base distante configurée comme potentiellement réelle
    tant que son caractère de test n'est pas prouvé.
-   Ne pas créer de compte, réservation ou autre donnée de test dans une
    base réelle sans autorisation et plan de test explicites.
-   Protéger les données conservées sur ordinateur, notamment en cas de
    perte ou de partage de l'appareil.

------------------------------------------------------------------------

## 13. Règles obligatoires pour les développeurs et agents IA

1.  Lire ce guide, les consignes du dépôt et les références métier
    pertinentes avant d'agir.
2.  Inspecter le contexte réel : répertoire, branche, fichiers,
    versions, services et état Git.
3.  Ne jamais deviner un chemin, une commande, un paramètre, un nom de
    fichier ou un résultat.
4.  Comprendre le fonctionnement existant avant de proposer un
    changement.
5.  Effectuer des modifications minimales et ciblées.
6.  Ne pas répéter des audits, installations, prompts ou tests sans
    bénéfice clair.
7.  Préserver les données, relations, règles métier et contrôles de
    sécurité.
8.  Ne pas mélanger les modes métier ou leurs espaces de données.
9.  Ne pas modifier la production, lancer une migration ou effectuer une
    action destructive sans autorisation explicite.
10. Exécuter uniquement les validations pertinentes et rapporter les
    résultats réellement obtenus.
11. Ne pas pousser de commit GitHub ni déclencher de déploiement sans
    autorisation explicite.
12. Avant de proposer une installation desktop ou une synchronisation,
    inspecter l'architecture existante et les rapports déjà rédigés.
13. Distinguer clairement les décisions confirmées, les recommandations,
    les hypothèses et les points à valider.
14. Si des sources se contredisent, signaler le conflit et demander une
    décision plutôt que de choisir arbitrairement.

------------------------------------------------------------------------

## 14. Documents de référence à rechercher

Chemins relatifs à ce dossier de documentation. Voir aussi l'index
[README.md](README.md).

-   [02-modes/hotel/hotel.md](02-modes/hotel/hotel.md) --- spécification
    métier du mode Hôtel.
-   [02-modes/residence/residence.md](02-modes/residence/residence.md)
    --- spécification métier du mode Résidence.
-   [02-modes/agence-immobiliere/agence-immobiliere.md](02-modes/agence-immobiliere/agence-immobiliere.md)
    --- spécification métier du mode Agence immobilière.
-   [01-architecture/inscription-trois-modes.md](01-architecture/inscription-trois-modes.md)
    --- décisions relatives à l'inscription, au compte et aux espaces
    indépendants.
-   [03-etat-reel-et-ecarts.md](03-etat-reel-et-ecarts.md) --- écarts
    entre cette documentation et le code réel.
-   [04-decisions-ouvertes.md](04-decisions-ouvertes.md) --- registre
    unique des décisions à prendre.
-   `SAMA_HOME_Rapport_Hors_Ligne_Synchronisation_Web_Installable.md`
    --- étude d'architecture cible pour l'installation desktop, le
    hors-ligne et la synchronisation. **Absent de ce dossier** : à
    retrouver ou à rédiger.
-   `CLAUDE.md`, fichiers de règles d'agent et instructions du dépôt,
    s'ils existent.
-   Maquettes, décisions UX, schéma de données, migrations et tests
    disponibles.

Si un fichier n'est pas trouvé, le signaler. Ne pas inventer son contenu
et ne pas chercher à le remplacer silencieusement par une autre source.

------------------------------------------------------------------------

## 15. Comment utiliser ce guide

Ce guide est utile :

-   au démarrage d'une nouvelle session avec un agent IA ;
-   lors de l'arrivée d'un nouveau développeur ;
-   pour expliquer le produit à un prestataire ou à un responsable
    technique ;
-   pour orienter vers la bonne spécification métier ;
-   pour cadrer une étude de l'installation Windows/macOS et du
    fonctionnement hors ligne.

Pour une tâche précise, le workflow attendu est :

1.  lire ce guide et les consignes actives ;
2.  localiser et lire les documents pertinents ;
3.  inspecter l'état réel du code et des données concernées ;
4.  identifier les risques et les incertitudes ;
5.  proposer un plan ciblé ;
6.  attendre les autorisations nécessaires avant les actions sensibles ;
7.  effectuer les changements autorisés ;
8.  exécuter les vérifications pertinentes ;
9.  rapporter exactement ce qui a été modifié, testé et laissé en
    suspens.

------------------------------------------------------------------------

## Résumé en une phrase

**SAMA HOME est un logiciel de gestion multi-activité pour l'hébergement
et l'immobilier, avec trois modes métier séparés au sein d'un même
produit, une application web existante et un objectif de version
installable Windows/macOS utilisable hors ligne sur ordinateur puis
synchronisée avec le cloud --- sans jamais confondre cette vision avec
ce qui est déjà implémenté.**
