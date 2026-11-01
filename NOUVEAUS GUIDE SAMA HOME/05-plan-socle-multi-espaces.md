# SAMA HOME — Plan du socle multi-espaces (`Membership` + `businessMode`)

**Statut :** proposition à valider. Aucun code ni migration n'a été écrit.
**Date :** 27 octobre 2026
**Base :** lecture de `web/prisma/schema.prisma` et `web/src/lib/dal.ts`.
**Objectif :** permettre à un compte d'appartenir à plusieurs espaces professionnels, chacun avec son mode (Hôtel, Résidence, Agence) et son rôle, conformément à [01-architecture/inscription-trois-modes.md](01-architecture/inscription-trois-modes.md).

## 1. Constat qui oriente le plan

- `getCurrentUser()` ([dal.ts](../web/src/lib/dal.ts)) est le point d'entrée unique de l'identité. Il lit `User.establishmentId` et `User.role`.
- `.establishmentId` apparaît environ 327 fois dans 48 fichiers (actions serveur, `*-data.ts`, pages). `getCurrentUser` / `verifySession` sont appelés dans 46 fichiers.
- `requireActiveEstablishment()` contrôle déjà le statut de l'établissement et de l'abonnement à partir de `user.establishmentId`.
- La session est stockée en base (`Session`, avec expiration à 30 min d'inactivité et 12 h maximum). Le cookie ne contient que `{ sessionId }`.

**Conséquence :** si `getCurrentUser()` continue de renvoyer `establishmentId` et `role`, mais avec les valeurs de **l'espace actif**, aucun des ~327 usages n'a à changer. Le changement se concentre sur le DAL, la session et le schéma.

## 2. Principe retenu

`getCurrentUser()` garde sa forme actuelle. Seule l'origine des valeurs change :

1. La session porte un `activeEstablishmentId`.
2. Ce champ est revalidé à chaque requête contre un `Membership` existant de l'utilisateur.
3. `establishmentId` et `role` renvoyés sont ceux de ce `Membership`.

Le tenant vient toujours de la session serveur, jamais du client (règle 1.1 de `AGENTS.md`). Le sélecteur d'espace est une Server Action qui vérifie l'appartenance avant de modifier la session.

## 3. Changements de schéma (additifs uniquement)

| Changement | Détail |
|---|---|
| Enum `BusinessMode` | `HOTEL`, `RESIDENCE`, `REAL_ESTATE` |
| `Establishment.businessMode` | Valeur par défaut pour l'existant : à décider (décision n° 3 du registre). Non destructif |
| Modèle `Membership` | `id`, `userId`, `establishmentId`, `role` (`UserRole`), `createdAt` ; `@@unique([userId, establishmentId])` ; `onDelete: Restrict` comme le reste du schéma |
| `Session.activeEstablishmentId` | Nullable, clé vers `Establishment` |
| `User.establishmentId` et `User.role` | **Conservés** pendant toute la transition, puis déclarés obsolètes dans un lot ultérieur |

Rétro-compatibilité : une migration de données crée un `Membership` pour chaque `User` ayant un `establishmentId`, avec son `role` actuel. Les comptes de plateforme (`isPlatformAdmin`, sans établissement) n'en reçoivent pas.

## 4. Découpage en lots

Chaque lot est livrable seul, testable en local, et n'introduit aucune régression visible.

| Lot | Contenu | Risque |
|---|---|---|
| **A. Schéma** | Enum, `businessMode`, `Membership`, `Session.activeEstablishmentId`, migration de données. Aucun changement de comportement | Moyen : migration sur base réelle |
| **B. DAL** | `getCurrentUser()` lit l'espace actif via `Membership`. Repli : si `activeEstablishmentId` est nul, utiliser l'unique `Membership` de l'utilisateur. Tests de non-régression | **Élevé** : toute l'authentification en dépend |
| **C. Sélecteur** | Action serveur « changer d'espace » ; menu du compte ; invalidation du cache entre espaces | Moyen |
| **D. Création d'espace** | « Ajouter un espace professionnel » avec contrôle des droits et de l'abonnement | Moyen |
| **E. Inscription** | Choix du mode sur la page d'accueil, conservé jusqu'à la création, création idempotente du compte et de l'espace | Moyen |
| **F. Rôles par espace** | Retirer la lecture de `User.role` au profit de `Membership.role`, nettoyage de `User.establishmentId` | Moyen |

Les lots A, B et C suffisent pour qu'un compte voie plusieurs espaces. D et E complètent le parcours d'inscription. Les modes Hôtel, Résidence et Agence viennent ensuite, sur ce socle.

## 4 bis. Avancement

**Lot A : écrit et vérifié sur une base locale vierge (27 octobre 2026). Non commité, non appliqué à Supabase.**

- Fichiers : `web/prisma/schema.prisma` (+52 lignes, ajouts uniquement) et `web/prisma/migrations/20261027100000_add_membership_business_mode/migration.sql`.
- Vérifié sur la base locale `samahome_test_lot_a_membership` (créée vide, marquée « test », port 2026) : les 28 migrations s'appliquent ; aucune dérive entre le schéma et les migrations (`prisma migrate diff`) ; rétro-remplissage rejouable sans doublon ; comptes de plateforme et comptes sans rôle ignorés ; `businessMode` vaut `RESIDENCE` par défaut ; suppression d'un compte supprime ses appartenances ; suppression d'un espace met `activeEstablishmentId` à `NULL`.
- Aucune lecture de ces nouvelles colonnes par l'application : le comportement est inchangé.
- **Tests (mis à jour le 27 octobre 2026) :** les 408 tests unitaires passent. Les 8 échecs de `session-lifecycle.test.mts` venaient de son horloge figée au 22 octobre, alors que `jose` vérifie l'expiration du cookie avec l'heure réelle ; l'instant de référence est maintenant l'heure réelle au lancement. Les 3 échecs OTP dépendaient de l'environnement du shell (adresse de base dans `DATABASE_URL`), pas du code.
- **Build (mis à jour le 28 octobre 2026) :** `npm run build` passe (0 erreur TypeScript, 41 pages). Il était bloqué par des modules manquants du sélecteur de langue et de thème (`actions/locale`, `actions/theme-preference`, `theme-icons`, `theme-constants`, `i18n/config`, `i18n/messages`) : ils ont été créés d'après l'usage du code existant. La page `/login` redirigeait toujours vers `/dashboard` (boucle infinie hors développement) : la redirection est maintenant limitée à `NODE_ENV=development` avec `DEV_BYPASS_AUTH=true`.
- **Lint :** 28 erreurs et 58 avertissements subsistent, tous dans des fichiers étrangers au lot A (surtout `next.config.ts`, qui utilise `any` pour le correctif Windows de `AGENTS.md` §4.1, et des pages de mot de passe oublié). La règle « 0 avertissement » de `AGENTS.md` §7 n'est donc pas encore tenue.
- **Avant la production :** appliquer par la procédure de déploiement documentée (`docs/production/DEPLOY.md`), après sauvegarde.

## 4 quater. Lot B : écrit et vérifié (28 octobre 2026). Non commité, non appliqué à Supabase.

`getCurrentUser()` et `getCurrentUserOrNull()` renvoient maintenant `establishmentId` et `role` de l'espace actif, lus dans `Membership` (une seule fonction, `loadCurrentUser`, dans `web/src/lib/dal.ts`). Le choix de l'espace est une fonction pure testée seule (`web/src/lib/active-space.ts`). Les ~327 usages de `user.establishmentId` n'ont pas changé.

- **Écritures :** création de compte par un admin, deux inscriptions d'établissement et changement de rôle écrivent aussi l'appartenance, dans la même transaction. Un compte de plateforme n'en reçoit volontairement aucune.
- **Suppression d'un établissement :** refusée (transaction annulée) si un compte appartient aussi à un autre espace (`web/src/lib/membership-guards.ts`). **Purge d'un compte :** refusée si le compte a plus d'une appartenance.
- **Migration de rattrapage** `20261028100000_replay_membership_backfill` : rejoue le rétro-remplissage pour les comptes créés entre les lots A et B.
- **Vérifié :** `tsc` sans erreur ; 423 tests unitaires ; `npm run build` ; 10 vérifications SQL réelles (`web/scripts/__lot-b-membership-db-checks.mts`, base de test locale uniquement) ; deux revues ECC sans défaut critique.
- **Fragilité de test connue :** trois tests OTP (« local autorisé ») échouent si `DIRECT_URL` ou `SAMA_ENV` sont définies dans le shell au lancement de `npm test`. Ils ne neutralisent pas ces variables.

**À faire AVANT le lot C** (aujourd'hui sans effet, car aucun compte ne peut avoir deux espaces ; dangereux dès que le lot C le permet) :

1. `users.ts` (lecture, modification, réinitialisation de mot de passe, suppression) et `users-data.ts` retrouvent encore les comptes par la colonne historique `User.establishmentId`. Passer à `memberships: { some: { establishmentId } }`, et limiter la réinitialisation de mot de passe et la suppression des sessions à ce qui est légitime pour un compte partagé.
2. La règle « au moins un ADMIN » compte sur la colonne historique : la calculer sur `Membership`.
3. Suppression ou purge d'un compte multi-espaces : détacher l'appartenance d'un seul espace au lieu de refuser.
4. Message de connexion (`auth.ts`, route Google) testé sur la colonne historique : l'aligner sur l'espace actif.
5. Rendre `findFirst` déterministe (`orderBy`) pour le remplaçant de purge et le compte de développement.
6. `prisma/seed.ts` et `scripts/__p118-seed-test-data.mts` créent des comptes sans appartenance : y ajouter les appartenances ou les déclarer obsolètes.
7. L'inscription collecte déjà `activityMode` (Résidence, Hôtel, Agence) sans l'utiliser : à brancher sur `Establishment.businessMode` au lot E.

## 4 quinquies. Points d'avant-lot C réglés et lot C : écrit, build vérifié (29 octobre 2026). Non commité, non appliqué à Supabase.

**Points d'avant-lot C (liste de la section 4 quater) :**

- Points 1 et 2 réglés : les comptes d'un espace sont retrouvés par `Membership` (`findSpaceUser`, `listUsers`) et la règle « au moins un ADMIN » est calculée sur `Membership`. Un compte partagé entre espaces ne peut pas être modifié ni supprimé depuis un seul espace (message dédié).
- Point 3 **non réglé** : un compte partagé est refusé, pas détaché. À reprendre avec le lot D.
- Point 4 réglé : le message de connexion vient de `blockingStatus` (`web/src/lib/login-gate.ts`), testé. Priorité : en attente, refusé, suspendu. Aucun blocage si un espace est actif.
- Points 5 et 6 réglés : `orderBy createdAt asc` sur les recherches de remplaçant, et les comptes de test créent leurs appartenances. Le point 7 (`activityMode` vers `businessMode`) reste pour le lot E.

**Lot C (sélecteur d'espace actif) :**

- `switchSpace` (`web/src/app/actions/space.ts`) ignore tout identifiant venu du formulaire sauf l'espace candidat, qui est revérifié : appartenance réelle et espace ACTIVE. L'écriture est limitée à la session courante (`{ id: sessionId, userId }`).
- `getCurrentUser()` redirige vers `/espaces` quand le compte a plusieurs espaces et aucun choix valide. La page `/espaces` n'appelle pas cette fonction, pour éviter une boucle.
- Le bandeau (`space-switcher.tsx`) affiche le vrai nom et le mode de l'espace actif. Les chiffres fictifs ont été remplacés par le libellé du mode.

**Vérifié après réparation du disque :** `tsc` 0 erreur ; 434 tests réussis ; `npm run build` réussi.
**Vérifié dans un navigateur (29 octobre 2026, build de production, base locale `samahome_test_lot_a_membership`, script `web/scripts/__lot-c-browser-seed.mts`) :** un compte à deux espaces (Hôtel + Agence) est envoyé vers `/espaces` dès qu'il ouvre une page métier (`/logements`) ; le choix de l'Agence affiche « Agence immobilière » dans la barre latérale et le vrai nom dans l'en-tête ; le sélecteur propose l'autre espace, l'espace actif est coché et grisé ; passer à l'Hôtel change la barre latérale en « Gestion d'hébergement ».
**Constats du test, corrigés le jour même et revérifiés dans le navigateur :**
- `/dashboard` n'appelait pas `getCurrentUser()` : un compte à deux espaces y arrivait sans choix. Corrigé : la page passe par `getCurrentUser()` (redirection vers `/espaces`) et prend par défaut le mode de l'espace actif ; `?mode=` reste un aperçu.
- Le nom d'un espace long s'empilait sur plusieurs lignes dans le sélecteur de l'en-tête : corrigé (coupure du texte, largeur maximale).
- **Reste à faire :** le contenu du tableau de bord est toujours la maquette fixe (« Moussa », 12 chambres, 20 mai 2025) ; à remplacer par les vraies données de l'espace actif.
- Non essayé dans le navigateur : compte à un seul espace et espace suspendu (couverts par les tests automatiques).

**Incident :** le volume D: (exFAT) a eu des secteurs défectueux (« Full Repair Needed »). `chkdsk D: /f` les a corrigés et a remplacé des clusters dans le client Prisma généré, qui a été régénéré. Les 156 fichiers modifiés étaient intacts.

## 4 sexies. Lot D : « Ajouter un espace professionnel », écrit et vérifié (29 octobre 2026). Non commité, non appliqué à Supabase.

**Règles retenues (décisions techniques prises par délégation) :**

- **Droits :** seul un ADMIN de son espace actif peut ajouter un espace ; jamais un compte de plateforme. Le serveur décide, le lien affiché dans le menu n'est qu'un confort.
- **Plafond :** 3 espaces par compte (`MAX_SPACES_PER_ACCOUNT`, `web/src/lib/space-creation.ts`), pour empêcher la multiplication d'essais gratuits. Le nombre est relu en base dans la transaction. À revoir avec la grille tarifaire (décision n° 5).
- **Abonnement :** chaque espace a le sien. Le nouvel espace suit la modération de la plateforme comme l'inscription : `PENDING` (approbation manuelle) ou `ACTIVE` avec essai si l'approbation automatique est activée.
- **Données :** rien de l'espace actuel n'est copié ni modifié. Le nouvel espace est créé avec son `businessMode` choisi (Résidence, Hôtel, Agence), une appartenance ADMIN et un journal d'audit, dans une seule transaction.
- **Après création :** espace actif d'emblée, on bascule dessus ; en attente, un message l'explique et l'espace apparaît grisé (« En attente d'approbation ») dans le sélecteur.

**Fichiers :** `actions/space.ts` (`createSpace`), `lib/space-creation.ts`, `app/espaces/nouveau/` (page et formulaire), lien dans `space-switcher.tsx`.

**Vérifié :** `tsc` 0 erreur ; 448 tests (14 nouveaux : règles pures et action, avec champs forgés `userId`/`role`/`status`/`establishmentId` ignorés) ; `npm run build` ; navigateur : création en attente, espace grisé dans le sélecteur, quatrième espace refusé par le plafond. Non essayé dans le navigateur : approbation automatique (couverte par les tests automatiques).

**Reste pour le lot D :** détacher un compte partagé à la suppression d'un espace (aujourd'hui refusée), et afficher côté plateforme les espaces supplémentaires avec leur administrateur (la liste plateforme lit encore la colonne historique, à vérifier).

## 4 septies. Lot E : le mode choisi à l'inscription est enregistré (29 octobre 2026). Non commité, non appliqué à Supabase.

**Constat :** le formulaire d'inscription proposait déjà Résidence, Hôtel et Agence et envoyait `activityMode`, mais le serveur l'oubliait : tout espace créé était « Résidence » par défaut.

**Changement :**
- Migration additive `20261029100000_add_otp_business_mode` : colonne `OtpVerification.businessMode` (défaut `RESIDENCE`). Le mode est conservé côté serveur entre l'envoi du code et sa validation ; il n'est jamais relu depuis le navigateur à l'étape 2.
- `registerEstablishment` convertit le choix (`AGENCY` vers `REAL_ESTATE`, `fromShellMode`) et l'enregistre ; `verifyOtpAndRegister` et le parcours Google l'appliquent à `Establishment.businessMode`. Une valeur inconnue est refusée par le schéma de validation.

**Vérifié :** `tsc` 0 erreur ; 450 tests (2 nouveaux : conservation et conversion du mode, mode absent ou invalide) ; migration appliquée sur la base locale de test ; 4 vérifications SQL réelles (`web/scripts/__lot-e-otp-mode-db-check.mts`) ; `npm run build`. **Non essayé dans le navigateur :** l'inscription complète exige l'envoi d'un vrai e-mail.

**Pas encore fait pour le lot E :** le texte de la page d'accueil et du formulaire ne change pas selon le mode (le contenu de chaque mode viendra avec les lots métier) ; l'espace créé s'ouvre sur le tableau de bord du mode choisi, dont les données restent celles de la maquette.

**Avant la production :** cette migration s'ajoute à celles des lots A et B ; procédure `docs/production/DEPLOY.md`, après sauvegarde.

## 4 octies. Les trois tableaux de bord réels (29 octobre 2026). Non commité, non appliqué à Supabase.

**Avant :** `/dashboard` affichait trois maquettes à chiffres fixes (« Moussa », 12 chambres, 3 450 000 FCFA, 20 mai 2025).

**Maintenant :** un tableau de bord par mode (`Establishment.businessMode`), alimenté par les données réelles de l'espace actif.
- **Calculs purs et testés :** `web/src/lib/dashboard-metrics.ts` (comptage par statut, taux d'occupation, soldes à recouvrer, dernières occupations).
- **Lecture unique :** `web/src/lib/dashboard-overview.ts`, qui réutilise les services existants (statut des logements, résumé de paiement, résumé financier). Filtrée par l'espace de la session, jamais par le navigateur.
- **Résidence :** logements libres, séjours en cours, arrivées et départs du jour, recettes, soldes à recouvrer.
- **Hôtel :** taux d'occupation, rack des chambres, alertes réelles, 5 dernières occupations sans nom de client. Pas d'alerte ménage ni entretien : ces modules n'existent pas.
- **Agence :** biens, loués, loyers encaissés, impayés. Mandats, visites, commissions et reversements sont annoncés « Bientôt », sans aucun chiffre.
- **Shell :** nom et rôle du compte réels, vraie horloge, faux compteur de notifications supprimé, pages inexistantes (Rapports, Contrats, Échéances) grisées « Bientôt » au lieu de mener à une erreur 404. `?mode=` ne sert plus qu'en développement local.
- **Corrigé au passage :** `/register` redirigeait sans condition vers le tableau de bord, y compris en production.

**Vérifié :** `tsc` 0 erreur ; 466 tests ; `npm run build` ; rendu navigateur des trois modes sur ordinateur et mobile, avec des données de démonstration locales (`web/scripts/__dashboard-demo-seed.mts`, base de test uniquement).

**Reste :** pages Rapports, Contrats et Échéances ; modules métier de l'Agence ; ménage et maintenance de l'Hôtel ; notifications réelles dans la cloche.

## 4 ter. Revue ECC du lot A (27 octobre 2026) et garde-fous du lot B

Deux revues en lecture seule (`ecc:database-reviewer`, `ecc:security-reviewer`) : **aucun défaut dans le lot A, qui peut être appliqué.** Leurs constats portent sur le lot B. Ils sont issus de la lecture du code, sans test exécuté.

**À traiter avant ou avec le lot B**

1. **Suppression d'un établissement** (`establishment-approval.ts`, lignes 434 et 464-471) : elle repose sur `User.establishmentId`. Avec des appartenances multi-espaces, elle détruirait un compte qui appartient aussi à un autre espace, ou échouerait sur la clé `Restrict`. Il faut supprimer les `Membership` de l'espace, ne supprimer que les comptes sans autre appartenance, et ajouter un test avant de dégeler ce chemin (voir `establishment-deletion-gate.test.mts`).
2. **Une seule fonction `resolveActiveContext(userId, sessionId)`** pour `getCurrentUser`, `getCurrentUserOrNull`, le layout et les gardes. Sinon le layout affiche un espace et les actions écrivent dans un autre. `verifySession` doit aussi transmettre `sessionId`.
3. **Relire `Membership` à chaque requête.** Ne jamais se fier à `Session.activeEstablishmentId` seul : il reste périmé si l'appartenance est révoquée. Pas d'appartenance valide : repli sur l'unique appartenance restante, sinon écran de sélection, jamais sur `User.establishmentId`.
4. **Le rôle vient de `Membership.role`**, jamais de `User.role`. Sinon un ADMIN de l'espace A obtient `requireAdmin` dans l'espace B. `isPlatformAdmin` reste lu sur `User`.
5. **Double écriture pendant la transition :** création de compte (`users.ts`, `establishment-registration.ts`, `platform-settings.ts`) et changement de rôle écrivent le `Membership` dans la même transaction. La migration du lot A est un instantané : rejouer son rétro-remplissage au démarrage du lot B pour les comptes créés entre-temps.
6. **Action « changer d'espace » :** l'identifiant cible n'est qu'un candidat. Vérifier l'appartenance pour l'utilisateur de la session, vérifier que l'espace est actif, écrire avec `updateMany({ where: { id: sessionId, userId } })`, puis `redirect` sans rappeler le DAL (`getCurrentUser` est mémoïsé par requête). Journal d'audit et limitation de débit. Jamais d'espace actif dans le cookie ni dans le JWT.
7. **Création de session :** `activeEstablishmentId` vide ou fixé par le serveur.
8. **Statut de l'espace :** décider si un espace non actif peut être l'espace actif (recommandé : non, sauf pour l'écran de sélection).
9. **`user-purge.ts` :** choisir le remplaçant ADMIN via `Membership`.
10. **`DEV_BYPASS_AUTH` :** le contournement ne doit pas désigner un ADMIN arbitraire parmi tous les espaces ; sans appartenance explicite, le refuser.
11. **Mode des établissements existants :** tous passent en `RESIDENCE`. Prévoir un moyen de le modifier côté plateforme.

**Tests d'acceptation ajoutés pour le lot B**

- ADMIN de A et simple membre de B : `requireAdmin` réussit dans A, échoue dans B.
- Changement vers un espace sans appartenance : refusé ; un identifiant forgé dans le formulaire ou l'URL est ignoré.
- Appartenance révoquée en cours de session : accès perdu à la requête suivante.
- Rétrogradation de rôle : `Membership.role` et `User.role` cohérents immédiatement.
- Session sans espace actif : repli sur l'unique appartenance ; compte sans appartenance ou sans rôle : aucun accès.
- Deux sessions du même compte sur deux espaces : isolées.
- Suppression d'un espace avec des comptes multi-espaces : les autres espaces et comptes restent intacts.
- Administrateur de plateforme : accès inchangé, aucun accès métier aux espaces par ce seul statut.

## 5. Points de vigilance

- **Isolation :** après un changement d'espace, aucune donnée de l'ancien espace ne doit rester visible (caches, `cache()` de React, liste en mémoire). `getCurrentUser` est mémoïsé par requête : à vérifier avec le changement de session dans la même requête.
- **Sessions existantes :** à la livraison du lot B, les sessions sans `activeEstablishmentId` doivent continuer à fonctionner (repli sur l'unique `Membership`).
- **Droit à l'oubli :** `user-purge.ts` doit supprimer les `Membership`. Règle 2.4 de `AGENTS.md`.
- **Suppression d'un espace :** si un utilisateur n'a plus aucun `Membership`, définir le comportement (déconnexion, écran d'accueil).
- **Contournement de développement :** `DEV_BYPASS_AUTH` ([dal.ts](../web/src/lib/dal.ts)) doit rester inactif hors développement. À réexaminer avec le nouveau modèle.
- **Base distante :** la migration, la migration de données et les tests s'exécutent sur une base locale isolée. Jamais sur la base Supabase potentiellement réelle sans autorisation explicite.

## 6. Tests d'acceptation du socle

1. Un compte avec un seul espace se comporte exactement comme aujourd'hui.
2. Un compte avec deux espaces voit uniquement ses espaces dans le sélecteur.
3. Après un changement d'espace, les listes, rapports et recherches ne montrent que l'espace actif.
4. Forger un `establishmentId` (formulaire ou URL) n'ouvre aucun accès : le serveur ne lit que la session.
5. Un `Membership` révoqué est refusé à la requête suivante, sans attendre l'expiration de la session.
6. Un rôle ADMIN dans l'espace A ne donne aucun droit dans l'espace B.
7. Un administrateur de plateforme reste distinct d'un ADMIN d'espace.
8. La migration de données est rejouable sans doublon de `Membership`.
9. `npm run build` passe sans erreur TypeScript ni avertissement ESLint.

## 7. Décisions retenues pour le lot A

Prises par délégation le 27 octobre 2026, détail dans [04-decisions-ouvertes.md](04-decisions-ouvertes.md) :

- **Abonnement :** un par espace. `Subscription` ne change pas.
- **Rôles :** `ADMIN` et `GESTIONNAIRE`, portés par `Membership`.
- **Modes :** Hôtel et Résidence partagent le moteur d'hébergement ; `businessMode` pilote vocabulaire, navigation et modules. Les établissements existants passent en `RESIDENCE`.

Le lot A peut donc démarrer dès que l'autorisation de modifier le code est donnée. Il s'exécute uniquement sur une base locale isolée.

## 8. Ce que ce plan ne couvre pas

Les fonctions métier de chaque mode, le hors-ligne et le desktop, la grille tarifaire et la vitrine publique de l'agence.
