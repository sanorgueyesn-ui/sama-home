# SAMA HOME — Registre consolidé des décisions du projet

**Objet :** réunir les décisions et améliorations retrouvées dans les discussions SAMA HOME, en séparant clairement ce qui a été confirmé par l’utilisateur, ce qui était une proposition de l’assistant et ce qui reste à confirmer.

**Important :** ce registre est établi à partir des échanges historiques récupérés. Il ne prouve pas que chaque fonctionnalité est déjà développée, testée ou déployée. Aucun changement de code, de base de données ou de production n’est autorisé par ce document.

---

## 1. Périmètre du produit et types d’établissement

### 1.1 Catégories à distinguer

Le projet a évolué au-delà de la seule gestion de chambres meublées. Les catégories évoquées sont :

- **Hôtel**
- **Résidence**
- **Agence immobilière**

La **Résidence doit rester une catégorie distincte de l’Hôtel**. Les besoins métier et les plafonds de forfait ne doivent pas être confondus entre catégories.

### 1.2 Socle fonctionnel initial retrouvé

Le master prompt initial de septembre 2026 portait sur une application web de gestion de chambres meublées et d’appartements, avec :

- logements et tarifs ;
- clients ;
- réservations et disponibilité ;
- locations et prolongations ;
- paiements, recettes et dépenses ;
- tableau de bord et rapports ;
- paramètres ;
- équipements/commodités : Wi-Fi, télévision, climatisation, salle de bain ;
- durées possibles : 2 h, 3 h, 12 h, 24 h, nuitée, semaine et mois ;
- acomptes, paiements multiples et moyens de paiement espèces, Wave et Orange Money ;
- interface responsive mobile/tablette/ordinateur ;
- libellés français et montants en FCFA dans les exemples ;
- conservation de l’identité visuelle et des logos officiels SAMA HOME.

Ce socle initial ne doit pas être interprété comme la liste complète des besoins ajoutés plus tard pour les hôtels et agences immobilières.

---

## 2. Forfaits et limites par catégorie

### 2.1 Limites confirmées par l’utilisateur

Décisions consignées le 21 octobre 2026 :

| Catégorie | Limites de capacité prévues |
|---|---|
| Hôtel | 10 chambres, 30 chambres ou illimité |
| Résidence | 10 chambres, 30 chambres ou illimité |
| Agence immobilière | 20 biens, 100 biens ou illimité |

La Résidence est distincte de l’Hôtel. La conception prévoit trois niveaux — **Essentiel, Pro, Premium** — pour chacune des trois catégories, soit neuf forfaits au total.

### 2.2 Limites de comptes confirmées

| Niveau | Nombre de comptes/utilisateurs |
|---|---:|
| Essentiel | 3 |
| Pro | 10 |
| Premium | Illimité |

Si une limite est atteinte, le système doit bloquer uniquement les **nouvelles créations ou réactivations** qui dépasseraient cette limite. Il ne doit pas désactiver automatiquement les chambres, biens ou comptes déjà existants.

Les contrôles de limites et de permissions doivent être faits côté serveur, pas uniquement par masquage des boutons dans l’interface.

### 2.3 Paiement annuel et tarifs

Décisions confirmées :
- l’abonnement annuel est payé en une fois et couvre 12 mois ;
- un mois est offert sur l’abonnement annuel.

Tarifs mensuels et annuels apparus dans une réponse antérieure :

| Niveau | Mensuel | Annuel affiché dans les notes |
|---|---:|---:|
| Essentiel | 5 000 FCFA | 55 000 FCFA |
| Pro | 10 000 FCFA | 110 000 FCFA |
| Premium | 20 000 FCFA | 220 000 FCFA |

**Réserve importante :** les notes historiques indiquent que ces montants avaient été proposés comme provisoires et n’étaient pas encore validés. Ne pas les traiter comme prix définitivement approuvés. Les prix des forfaits Agence immobilière n’ont pas été retrouvés.

La différenciation des forfaits par les fonctionnalités et par les limites a été acceptée comme principe de conception ; cela ne valide pas automatiquement chaque détail de catalogue fonctionnel proposé ensuite.

---

## 3. Fonctionnalités prévues par type d’établissement

### 3.1 Hôtel

Un découpage proposé dans la discussion était :

- **Essentiel :** réservations, chambres, séjours.
- **Pro :** fonctions de base, plus ménage, maintenance et rapports d’occupation.
- **Premium :** fonctions précédentes, plus gestion multi-hôtels et rapports consolidés.

**Statut :** cette liste est retrouvée comme proposition de l’assistant. Les sources récupérées ne permettent pas d’affirmer que chaque fonction et chaque niveau ont été validés séparément par l’utilisateur, ni qu’ils sont développés.

### 3.2 Résidence

Le socle proposé comprenait :
- réservations ;
- clients ;
- paiements ;
- caisse ;
- dépenses.

Les niveaux supérieurs proposés comprenaient :
- **Pro :** rapports et exports ;
- **Premium :** consolidation.

**Statut :** il s’agit d’un découpage proposé, à distinguer des décisions confirmées sur la catégorie Résidence, les plafonds et les comptes.

### 3.3 Agence immobilière

Il a été explicitement relevé qu’un **module métier Agence immobilière spécifique est nécessaire** ; le module hôtelier ne suffit pas à couvrir automatiquement ses besoins.

Une proposition de découpage par niveau était :

- **Essentiel :** catalogue de biens, contacts et suivi de base.
- **Pro :** mandats, visites, baux et suivi des loyers.
- **Premium :** commissions, comptes propriétaires et consolidation.

**Statut :** cette liste est retrouvée comme proposition de l’assistant, et non comme preuve que tous ces éléments ont été individuellement validés. Il faut retrouver la conversation de validation détaillée avant de traiter chaque fonction comme une exigence finale.

---

## 4. Langues de l’interface et documents

### 4.1 Décision de lancement retrouvée

Le 23 octobre 2026, l’utilisateur a validé ces trois langues pour le lancement :

1. **Français**
2. **Arabe**
3. **Anglais**

La prise en charge de l’arabe doit inclure une véritable disposition **RTL (right-to-left, de droite à gauche)**, et pas seulement la traduction des textes.

Une discussion antérieure mentionnait le wolof, mais la sélection de lancement la plus récente retrouvée est **français, arabe et anglais**.

### 4.2 Étendue de la traduction

- La traduction doit couvrir l’ensemble de l’interface, pas seulement quelques pages.
- Les libellés codés en dur en français doivent être repérés et migrés vers un système de traduction.
- Le sélecteur de langue et la couverture de toutes les pages n’étaient pas encore implémentés au moment de l’audit historique.
- La prise en charge arabe doit être testée pour l’alignement, la navigation, les composants et les documents PDF.

### 4.3 Langue des documents indépendante

La langue d’un document doit être indépendante de la langue choisie pour l’interface. L’utilisateur peut, par exemple, travailler dans une langue et produire un contrat ou un PDF dans une autre.

**Statut :** la sélection des langues de lancement et le RTL arabe sont confirmés. La séparation de la langue des documents et de l’interface a été formulée comme une exigence/recommandation dans l’audit historique ; son implémentation reste à vérifier.

---

## 5. Installation locale sur Windows et MacBook : état exact des discussions retrouvées

L’utilisateur demande maintenant de retrouver la décision concernant l’installation du logiciel sur un ordinateur Windows ou un MacBook.

Les traces historiques récupérées montrent :
- le projet est une application web Next.js ;
- le code de l’application se trouve dans `web/` ;
- le développement a été effectué sur un PC Windows ;
- l’architecture de déploiement discutée mentionnait Railway, avec le répertoire racine Railway défini sur `/web` ;
- un déploiement web et l’usage sur PC ont été évoqués.

**En revanche, aucune décision explicite confirmée n’a été retrouvée indiquant que SAMA HOME doit être livré comme logiciel de bureau installable nativement sur Windows et macOS.** Les discussions récupérées ne confirment pas non plus un fonctionnement hors ligne, un installateur `.exe`/`.dmg`, ni une application de bureau empaquetée.

Il ne faut donc pas présenter l’installation native Windows/Mac comme une décision déjà validée. Le point doit rester **à confirmer** après récupération de la conversation exacte. L’utilisation du site depuis un navigateur sur ordinateur ne prouve pas l’existence d’une installation locale native.

---

## 6. Interface responsive : décisions confirmées

Décision du 2 octobre 2026 :

- **Largeur inférieure à 1024 px :** interface mobile, barre de navigation inférieure et pas de barre latérale.
- **Largeur égale ou supérieure à 1024 px :** barre latérale de **240 px** sur ordinateur.
- Préserver le comportement mobile validé à **390 px** de largeur.
- La barre inférieure mobile doit être limitée à **Accueil**, **Locataires**, **Biens**.
- Placer **Menu** en haut à droite ; les fonctions secondaires doivent passer par ce menu plutôt que surcharger la barre inférieure.
- Les pages concernées par le travail responsive comprenaient notamment Tableau de bord, Biens, Réservations, Locations, Paramètres et Caisse.

Le travail responsive ne signifie pas que l’application est un logiciel de bureau natif ; ce sont deux sujets différents.

---

## 7. Photos des logements

Améliorations retrouvées dans les échanges :
- autoriser plusieurs photos par chambre ou appartement ;
- prévisualiser les images ;
- définir une photo principale ;
- remplacer et supprimer des photos ;
- ajouter une section **« Photos du logement »** dans **Logements → Modifier un logement** ;
- sur téléphone, afficher une grande photo principale suivie de vignettes ;
- conserver `Property.photo` pour la photo principale et prévoir un modèle `PropertyImage` pour la galerie ;
- vérifier type MIME et taille, protéger l’accès et utiliser des noms de fichiers sûrs ;
- prévoir une suppression propre des objets associés ;
- ne pas utiliser `web/public` comme stockage final de production.

Le projet dispose d’un module de stockage objet S3 dans le code, mais son fonctionnement et sa configuration de production doivent être vérifiés séparément.

---

## 8. Paramètres, apparence et règles métier

Décisions et préférences retrouvées :
- centraliser les règles configurables dans **Paramètres** ;
- éviter de disperser les règles métier dans plusieurs écrans ;
- rendre configurables les tarifs, durées, horaires, règles de séjour et moyens de paiement ;
- configurer séparément les seuils d’identification pour les chambres et les appartements ;
- centraliser les paramètres d’apparence ;
- conserver l’identité visuelle SAMA HOME et le logo officiel.

Palette retrouvée :
- bleu nuit `#12304A` ;
- corail `#E5484D` ;
- orange `#F59E0B` ;
- encre `#172026` ;
- fond doux `#F7F8F6`.

Préférence d’interface :
- thème sombre doux et reposant ;
- mode clair gris doux teinté, sans fond blanc dominant ;
- l’apparence personnalisable doit être gérée dans Paramètres.

---

## 9. Contrats, PDF et permissions

Décisions retrouvées le 23 octobre 2026 :
- conserver le **contenu du contrat** et son **PDF** ;
- conserver un instantané immuable du contenu de chaque révision ;
- stocker le PDF dans S3 ;
- ne pas régénérer un contrat silencieusement : la régénération doit être explicite, motivée et tracée dans l’audit ;
- respecter `MODULE_LOCATIONS` pour l’accès aux contrats existants ;
- rendre configurable le seuil à partir duquel un contrat est exigé.

La présence d’un fichier de génération de contrat dans le code ne prouve pas que le PDF rendu a été testé.

---

## 10. Catégories d’activité et approbation humaine

Décisions retrouvées :
- une activité demandée par un établissement ne doit pas devenir automatiquement son type effectif si elle requiert une approbation ;
- conserver séparément `requestedActivityType` et le type effectif ;
- garder le type effectif **RESIDENCE** jusqu’à validation de la plateforme lorsque le changement est soumis à approbation ;
- appliquer un parcours « demande, puis validation humaine » pour l’activité concernée ;
- une fonction d’approbation automatique des inscriptions avait également été évoquée, mais son état actuel doit être vérifié.

---

## 11. Tickets, Wi-Fi et guide d’expiration

### Tickets
Décisions retrouvées :
- création différée (« lazy ») : ne pas créer un ticket avant l’action qui le nécessite ;
- création atomique et idempotente ;
- numérotation simple et continue par établissement ;
- en cas de doublon, afficher l’heure de départ initiale et l’heure de départ actuelle si elles diffèrent ;
- mettre à jour l’heure de départ prévue selon la règle convenue ;
- garder le ticket minimal.

### Wi-Fi
- les identifiants Wi-Fi doivent être chiffrés ;
- algorithme retrouvé : **AES-256-GCM** ;
- la clé doit être conservée hors de la base de données ;
- la clé d’exécution Railway doit être distincte du coffre de récupération.

### Arrivées rétroactives
- limite historique retrouvée : **24 heures** ;
- conserver l’heure réelle d’arrivée, l’heure d’enregistrement, l’utilisateur ayant enregistré l’arrivée et le motif ;
- calculer le départ à partir de l’heure réelle d’arrivée.

### Guide d’expiration
- afficher le jour suivant comme **J+1**.

---

## 12. Permissions et rôles

- Les modèles de permissions doivent être modifiables uniquement avec la permission **`CAN_MANAGE_TEMPLATES`**.
- Les permissions sensibles doivent être vérifiées côté serveur.
- Les comptes bancaires et échéanciers de virement étaient réservés au rôle **ADMIN**, selon les notes historiques ; le gestionnaire conserve l’accès opérationnel prévu.
- Les rôles et permissions doivent être testés dans l’application réelle avant de déclarer la fonctionnalité prête.

---

## 13. Paiements des abonnements SAMA HOME

Décisions retrouvées le 23 octobre 2026 :
- **PayDunya est destiné aux abonnements SaaS SAMA HOME uniquement**, pas aux paiements de réservations ou de loyers ;
- confirmer un paiement automatiquement seulement après vérification côté serveur ;
- les frais de paiement sont pris en charge par SAMA HOME ;
- moyens de paiement souhaités : **Wave**, **Orange Money** et **Visa/Mastercard**, y compris pour les clients internationaux ;
- au moment de la discussion retrouvée, le compte marchand PayDunya n’était pas encore créé/vérifié.

---

## 14. Éléments techniques et état d’implémentation

Le projet retrouvé utilise :
- Next.js App Router ;
- TypeScript ;
- Prisma ;
- PostgreSQL ;
- application située dans `web/` ;
- Railway discuté comme cible de déploiement web, avec Root Directory `/web`.

Le rapport d’état mentionne dans le code des modules pour :
- clients ;
- logements et tarifs ;
- réservations ;
- locations et prolongations ;
- séjours ;
- caisse et virements ;
- dépenses ;
- utilisateurs et permissions ;
- abonnements ;
- génération de contrats PDF ;
- stockage d’images S3.

Le rapport précise qu’au cours de la session correspondante, aucun test, build ni démarrage de l’application n’a été exécuté. Les fichiers présents ne doivent donc pas être assimilés à une validation fonctionnelle.

---

## 15. Questions restant explicitement non résolues

1. **Installation native Windows et macOS :** aucune décision explicite confirmée n’a été retrouvée. L’utilisation web sur ordinateur est documentée, mais pas un installateur Windows/Mac ni le fonctionnement hors ligne.
2. **Forfaits Agence immobilière :** les montants exacts n’ont pas été retrouvés.
3. **Fonctionnalités par niveau de forfait :** plusieurs listes hôtel/agence proviennent de propositions de l’assistant ; elles doivent être distinguées des éléments que l’utilisateur a personnellement validés.
4. **Langues :** français, arabe et anglais sont confirmés pour le lancement ; l’état réel d’implémentation de la traduction complète et du RTL doit être vérifié.
5. **État des fonctionnalités :** une fonction mentionnée dans un rapport ou un fichier n’est pas forcément fonctionnelle, testée ou déployée.

---

## 16. Règle de travail pour la suite

Avant de préparer un nouveau prompt destiné à Claude :
1. distinguer chaque décision confirmée, proposition, fonction existante et point non résolu ;
2. ne pas inventer les détails manquants ;
3. ne pas répéter un audit déjà fait sans raison précise ;
4. ne pas lancer de tests, migrations, modifications de base ou actions de production sans autorisation explicite ;
5. conserver les décisions historiques et les contraintes de sécurité du projet.
