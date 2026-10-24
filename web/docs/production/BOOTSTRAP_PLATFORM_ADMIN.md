# Bootstrap du premier administrateur de plateforme

Document produit au Lot D12-P62 (procédure manuelle), mis à jour au Lot
D12-P63 (script dédié). **Le script décrit ici n'a jamais été exécuté — ni en
mode vérification, ni en mode écriture — par aucun des deux lots.** Même
convention que le reste de `docs/production/` : distingue systématiquement ce
qui est **VÉRIFIÉ** (lu réellement dans le code à la date de rédaction) de ce
qui **RESTE À IMPLÉMENTER** ou **N'A PAS ENCORE ÉTÉ EXÉCUTÉ**.

> **Historique et état actuel.** Les mentions « jamais exécuté » et les
> descriptions des Lots D12-P62/P63 (sections 1 à 3, 5 à 9 et fin du document)
> décrivent l'état à ces lots, conservé pour mémoire. Le comportement **actuel**
> du script, après la phase 1.3 (vérification de la cible avant toute
> connexion, deux modes séparés, marqueur de base en mode local), est décrit
> en **section 4**. En cas de divergence, la section 4 et le code de
> `scripts/bootstrap-platform-admin.mts` font foi.

## 1. ADMIN d'établissement vs administrateur de plateforme

Deux autorisations vérifiées par des gardes distinctes dans ce projet
(`requireAdmin()` teste `role === "ADMIN"`, `requirePlatformAdmin()` teste
`isPlatformAdmin`, `src/lib/dal.ts`). L'audit des Lots D12-P55 à P61
(historique) concluait qu'elles n'étaient fusionnées nulle part ; voir le
constat actuel sur leur cumul sous le tableau :

| | `role === "ADMIN"` (établissement) | `isPlatformAdmin === true` |
|---|---|---|
| Portée | Un seul établissement (`User.establishmentId`) | Transverse, aucun établissement par conception |
| Donne accès à | `/settings/users`, `/settings/expense-categories`, etc. (`requireAdmin()`, `src/lib/dal.ts`) | `/plateforme` uniquement (`requirePlatformAdmin()`, même fichier) |
| Peut confirmer un paiement d'abonnement ? | Non, explicitement refusé par `confirmSubscriptionPayment()` même s'il est ADMIN de son propre établissement | Oui, c'est la seule autorisation vérifiée par cette action |
| `establishmentId` | Toujours renseigné | `null` dans l'usage normal prévu par le schéma (voir `model User`, schema.prisma : "NULL pour un compte de plateforme") |

Un compte peut cumuler les deux (aucune contrainte en base ne l'empêche), ce
qui complique le raisonnement de sécurité — voir section 8. **Constaté dans le
code actuel** : la Server Action `createPlatformAdminUser`
(`src/app/actions/platform-settings.ts`) crée un compte avec
`isPlatformAdmin: true` **et** `role: "ADMIN"`, sans `establishmentId`. Un tel
compte passe `requireAdmin()`, qui ne teste que le rôle. Le script de
bootstrap, lui, crée un compte sans `role` (section 4). L'effet effectif d'un
compte `role: "ADMIN"` sans établissement sur les pages d'établissement n'est
pas examiné dans ce document : **à confirmer**.

## 2. Prérequis avant le bootstrap

- Accès à la base de données de l'environnement **cible**, soit via les
  variables d'environnement nécessaires au script (section 4), soit via un
  accès direct autorisé pour la procédure manuelle (section 5).
- Confirmation explicite, avant toute commande, de l'environnement réellement
  ciblé (`DATABASE_URL`) — ne jamais supposer qu'il s'agit de dev ou de
  production sans l'avoir vérifié. **Le script contrôle la cible avant toute
  connexion (section 4), mais ni lui ni cette documentation ne peuvent
  déterminer de façon fiable, à la place de l'opérateur, qu'il s'agit bien de
  l'environnement voulu.**
- Une sauvegarde récente et réussie de la base cible (voir
  [BACKUP.md](./BACKUP.md)) — avant toute opération en base, script ou
  manuelle, production ou non. Pour une base de **production** :
  `npm run backup -- --export-production=<hôte exact de DATABASE_URL>` ;
  sans option, `npm run backup` sauvegarde une base LOCALE et refuse une
  cible distante.
- Un identifiant de connexion (`username`) choisi à l'avance pour le futur
  compte, distinct de toute adresse e-mail de contact/notification de
  l'organisation, et **distinct de `SEED_ADMIN_USERNAME`** (le script refuse
  explicitement toute coïncidence, voir section 4).
- Un mot de passe fort, généré par le futur titulaire du compte lui-même (ou
  via un gestionnaire de secrets autorisé) — **jamais choisi, écrit ou
  transmis par la personne qui exécute le bootstrap**, et jamais consigné
  dans ce document, un ticket, un chat ou un e-mail en clair.

## 3. Méthode réellement disponible aujourd'hui

Un script dédié existe désormais : `scripts/bootstrap-platform-admin.mts`
(Lot D12-P63). **Il n'a jamais été exécuté, ni en mode vérification ni en
mode écriture, par ce lot ni le précédent** — son comportement a été vérifié
par relecture du code et par la reproduction de sa logique dans un script de
test temporaire, séparé et déjà supprimé (jamais le fichier livré lui-même).

La procédure manuelle directe en base documentée au Lot D12-P62 (section 5
ci-dessous) reste valide et disponible comme alternative — notamment si
l'exécution d'un script n'est pas souhaitée pour un compte déjà existant
(promotion d'un compte, plutôt que création).

Constaté dans le code actuel (révision de cette documentation) :
- `isPlatformAdmin: true` est écrit à trois endroits : (a)
  `scripts/bootstrap-platform-admin.mts` (hors de l'application, jamais lancé
  automatiquement) ; (b) la Server Action `createPlatformAdminUser`
  (`src/app/actions/platform-settings.ts`), appelée depuis
  `/plateforme/utilisateurs`, réservée à un administrateur de plateforme
  disposant de la permission `PLATFORM_USERS`, qui **crée un nouveau** compte
  avec `isPlatformAdmin: true` et `role: "ADMIN"`, sans `establishmentId`,
  refuse un identifiant ou un e-mail déjà utilisé et journalise
  `PLATFORM_ADMIN_CREATED` ; (c) la procédure manuelle en base (section 5).
  L'énoncé du Lot D12-P62 selon lequel aucune Server Action ni page ne l'écrit
  est **obsolète**.
- Dans les fichiers examinés pour cette révision (`platform-settings.ts`,
  `establishment-approval.ts`, `src/app/plateforme/utilisateurs/`), aucune
  action ne **promeut un compte existant** : `updatePlatformUserPermissions`
  ne modifie que les permissions d'un compte déjà de plateforme, et
  `deletePlatformUser` refuse de supprimer un compte de plateforme.
- `prisma/seed.ts` reste un mécanisme **distinct et non substituable** : il
  crée un `role: "ADMIN"` sans établissement et sans jamais définir
  `isPlatformAdmin` — `scripts/bootstrap-platform-admin.mts` refuse
  explicitement de créer un compte dont l'identifiant coïnciderait avec
  `SEED_ADMIN_USERNAME`, pour qu'aucune confusion entre les deux ne soit
  jamais possible.

## 4. Procédure recommandée : script dédié

### Deux modes séparés (état actuel — phase 1.3)

La cible est vérifiée **avant toute connexion à la base**, y compris en simple
vérification (qui lit la base).

- **Mode local (défaut)** : `npm run bootstrap:platform-admin` charge
  `.env.development.local` par-dessus `.env`, exige la garde de développement
  (`SAMA_ENV=local`, `SAMA_EXPECTED_DB`, base locale autorisée, aucune
  redirection d'URL) et, après le contrôle de la cible, le marqueur de base de
  test (`SAMA-HOME-LOCAL-TEST-ONLY`, lecture seule). Une cible distante est
  refusée. Écriture : `npm run bootstrap:platform-admin -- --write
  --target-host=<hôte local exact de DATABASE_URL>` (par exemple `127.0.0.1`).
  Les variables `BOOTSTRAP_PLATFORM_ADMIN_*` sont fournies par l'opérateur
  (valeurs fictives pour un test local).
- **Mode production (jamais par défaut)** : `--production` **et**
  `SAMA_DEPLOY_TARGET_HOST` (dans l'environnement du processus, égal à l'hôte
  exact de `DATABASE_URL`) **et** `--target-host=<même hôte>`. Le drapeau seul
  ne suffit jamais : la confirmation d'environnement ne peut pas être dérivée de
  l'argument qu'elle confirme. Une cible locale, un paramètre d'URL redirigeant
  la connexion ou `SAMA_ENV=local` sont refusés. `.env.development.local` n'est
  pas chargé dans ce mode et le marqueur de base de test n'est pas exigé
  (la base visée est la production, pas une base de test).

Dans les deux modes : refus si le compte existe déjà (jamais modifié, jamais
promu), refus si l'identifiant coïncide avec `SEED_ADMIN_USERNAME`,
`BOOTSTRAP_PLATFORM_ADMIN_CONFIRM` obligatoire avec `--write`.

### Vérification sans écriture (sans `--write`)

```bash
npx tsx scripts/bootstrap-platform-admin.mts
# ou : npm run bootstrap:platform-admin
# (mode production : ajouter --production --target-host=<hôte>, avec
#  SAMA_DEPLOY_TARGET_HOST dans l'environnement)
```

N'écrit jamais rien en base, quelle que soit l'issue. Vérifie, dans l'ordre,
**avant toute connexion à la base** :
1. `DATABASE_URL` définie.
2. `BOOTSTRAP_PLATFORM_ADMIN_USERNAME` / `_PASSWORD` / `_NAME` définies (voir
   `.env.example`).
3. `BOOTSTRAP_PLATFORM_ADMIN_USERNAME` ne coïncide pas avec
   `SEED_ADMIN_USERNAME`.
4. (avec `--write` seulement) `BOOTSTRAP_PLATFORM_ADMIN_CONFIRM` égal à
   l'identifiant.
5. La cible, selon le mode ci-dessus (garde de développement ou règles de
   déploiement et `--target-host`).

Puis affiche l'hôte:port de `DATABASE_URL` (jamais les identifiants de
connexion), vérifie le marqueur de base de test en mode local, se connecte,
vérifie qu'aucun compte n'existe déjà pour cet identifiant, et affiche un
résumé de ce qui **serait** créé — sans rien écrire.

### Confirmation nécessaire à la création (mode écriture)

```bash
# mode local
npm run bootstrap:platform-admin -- --write --target-host=<hôte local exact>
# mode production
npm run bootstrap:platform-admin -- --production --write --target-host=<hôte exact>
#   (avec SAMA_DEPLOY_TARGET_HOST dans l'environnement du processus)
```

En plus des vérifications ci-dessus, exige **une variable
supplémentaire** : `BOOTSTRAP_PLATFORM_ADMIN_CONFIRM`, qui doit valoir
**exactement** la même valeur que `BOOTSTRAP_PLATFORM_ADMIN_USERNAME`. Sans
cette correspondance exacte, le script refuse d'écrire — un simple `--write`
tapé par réflexe ou retrouvé dans un historique de commandes ne suffit jamais
à lui seul à déclencher une création.

Si, et seulement si, toutes les vérifications précédentes ont réussi ET
qu'aucun compte n'existe déjà pour cet identifiant : hache le mot de passe
avec `bcryptjs`, coût 12 (même paramètre que `src/lib/password.ts` — jamais
réinventé), puis crée le `User` avec `isPlatformAdmin: true` et **sans**
`role` ni `establishmentId` (champs omis de l'écriture, jamais définis à une
valeur arbitraire pour "faire fonctionner" une page).

**Permissions du compte créé (fait confirmé dans le code).** `permissions` est
une colonne `String?` sans valeur par défaut (`schema.prisma`) et le script ne
l'écrit pas dans l'insertion : elle vaut donc `NULL`. Or
`hasPlatformPermission` (`src/lib/permissions.ts`) traite une valeur absente,
`NULL` ou vide comme un compte aux **pleins pouvoirs** de plateforme (il accepte
aussi `PLATFORM_ALL` ou `ALL`). Un compte créé par ce script est donc, par
construction, un super-administrateur de plateforme. Ses permissions peuvent
ensuite être restreintes depuis `/plateforme/utilisateurs`
(`updatePlatformUserPermissions`, qui exige la permission `PLATFORM_USERS`).

**Contrôles automatiques et limite restante** : depuis la phase 1.3, le
script contrôle la cible avant toute connexion. En mode local : garde de
développement (hôte et port locaux, `SAMA_EXPECTED_DB`, aucune redirection
d'URL) puis marqueur de base de test. En mode production : cible distante
uniquement, hôte de `DATABASE_URL` égal à la fois à `SAMA_DEPLOY_TARGET_HOST`
(environnement) et à `--target-host` (argument), port explicite, aucune
redirection d'URL, `SAMA_ENV` différent de `local`. **Limite restante,
documentée plutôt que contournée par une fausse garantie** : ces contrôles
prouvent que l'opérateur a confirmé l'hôte visé, pas que cet hôte est bien
l'environnement voulu — un nom d'hôte ne le prouve jamais à lui seul. La
vérification de l'hôte/port affichés avant `--write` reste une responsabilité
humaine.

Le script n'est appelé automatiquement nulle part (ni `prisma/seed.ts`, ni le
build Next.js, ni le démarrage de l'application) — exécution manuelle
uniquement.

## 5. Procédure manuelle antérieure (alternative, toujours valide)

Documentée au Lot D12-P62 — reste utilisable, en particulier pour **promouvoir
un compte déjà existant** (le script du Lot D12-P63 ne fait que créer un
nouveau compte, jamais promouvoir un compte existant — voir section 6).

1. Identifier la ligne `User` à modifier (compte déjà existant à promouvoir,
   ou nouveau compte créé par un autre moyen déjà disponible).
2. Se connecter à la base **cible** avec un accès autorisé (`psql`, ou tout
   client équivalent dont l'usage est permis par l'hébergeur).
3. Identifier **sans ambiguïté** la ligne exacte, par son `id` :
   ```sql
   SELECT id, username, role, "establishmentId", "isPlatformAdmin", permissions
   FROM "User"
   WHERE username = '<identifiant exact, vérifié au clavier>';
   ```
   Confirmer qu'une seule ligne est retournée et que son contenu correspond
   bien au compte attendu avant de continuer.

   Relever aussi la valeur de `permissions`. **Faits confirmés dans le code**
   (`hasPlatformPermission`, `src/lib/permissions.ts`) : `NULL`, vide,
   `PLATFORM_ALL` ou `ALL` donnent les pleins pouvoirs de plateforme ; toute
   autre valeur est lue comme une liste (JSON ou séparée par des virgules) de
   modules, et le compte n'a que ceux qui y figurent. Un compte d'établissement
   existant peut porter des permissions d'établissement. Passer
   `isPlatformAdmin` à `true` ne rend donc **pas** l'opération sûre à lui seul :
   les pouvoirs effectifs dépendent de `permissions`. *Recommandation
   opérationnelle (pas une règle du code)* : décider explicitement, avant la
   promotion, des pouvoirs voulus. Cette procédure ne modifie pas
   `permissions` ; n'y écrire aucune valeur sans avoir vérifié le format attendu
   (l'application écrit une liste JSON de modules via
   `updatePlatformUserPermissions`).
4. Exécuter une mise à jour strictement ciblée sur cet unique `id` — **rien
   d'autre que `isPlatformAdmin`** :
   ```sql
   UPDATE "User"
   SET "isPlatformAdmin" = true
   WHERE id = '<id exact copié depuis l'étape 3, jamais retapé de mémoire>';
   ```
   Ne jamais utiliser une clause `WHERE` fondée sur `username`/`role` seuls
   dans cette commande d'écriture — uniquement l'`id`, déjà confirmé unique à
   l'étape précédente.
5. Vérifier immédiatement le résultat (section 7).

## 6. Étapes nécessitant une future implémentation

- Une fonctionnalité de **promotion** d'un compte déjà existant (par
  opposition à la création d'un nouveau compte) au niveau applicatif. Elle
  n'est pas démontrée dans les fichiers examinés (section 3) ; seule la
  procédure manuelle (section 5) est documentée pour ce cas. Le lot D12-P63
  interdit explicitement de créer "une fonctionnalité de promotion arbitraire
  de comptes existants" dans le script — une telle fonctionnalité nécessiterait
  sa propre conception de sécurité dédiée (qui peut promouvoir qui, avec
  quelles traces d'audit).
- **Présent dans le code** : une interface `/plateforme/utilisateurs` (liste,
  création d'un administrateur de plateforme par `createPlatformAdminUser`,
  modification des permissions par `updatePlatformUserPermissions`,
  suppression d'un compte *non* plateforme par `deletePlatformUser`), elle-même
  réservée à un administrateur de plateforme déjà actif — ce qui ne résout le
  problème que pour les opérations *suivantes*, jamais pour la toute première
  (problème de bootstrap circulaire, résolu par le script/la procédure manuelle
  hors application). **Non démontrés** : la promotion d'un compte existant et
  la révocation ou suppression d'un compte de plateforme par l'application.
- **Présent dans le code** : un mécanisme d'approbation d'établissement
  (`Establishment.status` : `PENDING` → `ACTIVE`) dans
  `src/app/actions/establishment-approval.ts` (`approveEstablishment`,
  `rejectEstablishment`, `suspendEstablishment`, `reactivateEstablishment`) et
  un réglage de plateforme d'approbation automatique (`setAutoApprovalEnabled`,
  journalisé). Les **règles métier** de cette politique (qui approuve, selon
  quels critères) ne sont pas décrites dans ce document : **à confirmer**.

## 7. Vérifications pour confirmer `isPlatformAdmin`

Que la création vienne du script (section 4) ou de la procédure manuelle
(section 5), en **lecture seule**, toujours filtrée par le même `id` exact :

```sql
SELECT id, username, role, "establishmentId", "isPlatformAdmin", permissions
FROM "User"
WHERE id = '<même id exact>';
```

Confirmer :
- `isPlatformAdmin` vaut bien `true`.
- `role` et `establishmentId` sont bien `NULL` (création via le script) ou
  strictement inchangés par rapport à l'état attendu (promotion manuelle
  d'un compte existant).
- `permissions` : `NULL` pour un compte créé par le script, ce qui donne les
  pleins pouvoirs de plateforme (section 4) ; pour une promotion manuelle,
  valeur inchangée par rapport à celle relevée à l'étape 3 de la section 5, et
  comprise (voir cette section) — jamais supposée.
- Une seule ligne est retournée.

Ne jamais exécuter une requête large (`WHERE "isPlatformAdmin" = true` sans
filtre sur un `id` précis) sur un terminal partagé ou journalisé — cela
afficherait potentiellement d'autres comptes à une personne qui n'a pas
besoin de les voir pour cette opération.

## 8. Contrôles d'accès à vérifier après création

- Connexion réelle avec ce compte → accès à `/plateforme` réussi (plus de
  redirection vers `/dashboard` par `requirePlatformAdmin()`).
- Le lien "Espace plateforme" apparaît dans la navigation (D12-P61).
- Si ce compte n'a pas aussi `role === "ADMIN"` d'un établissement : confirmer
  qu'il est bien redirigé vers `/dashboard` par `requireAdmin()` sur toute page
  réservée (`/settings/users`, etc.) — aucun privilège d'établissement ne
  doit avoir été accordé implicitement par cette opération.
- Un compte créé par `createPlatformAdminUser` (interface
  `/plateforme/utilisateurs`) a `role: "ADMIN"` sans `establishmentId` :
  `requireAdmin()` ne le redirige pas, puisqu'il ne teste que le rôle. Ne pas
  s'appuyer sur ce contrôle pour ces comptes sans avoir confirmé l'effet réel
  sur les pages d'établissement.
- Un compte créé par le script (section 4) n'a, par construction, ni `role`
  ni `establishmentId` — ce contrôle devrait donc systématiquement réussir
  pour ce cas. Pour un compte promu manuellement (section 5) à partir d'un
  compte préexistant du seed (`role: "ADMIN"`, sans établissement), la même
  recommandation qu'au Lot D12-P62 s'applique : envisager de retirer ce
  `role` pour obtenir un compte de plateforme "pur".

## 9. Procédure de récupération en cas d'erreur

- **Mauvais compte créé ou mauvaise ligne modifiée par erreur** : relire
  *immédiatement* l'état exact de la ligne concernée (ne jamais corriger de
  mémoire), puis annuler en remettant `isPlatformAdmin = false` (ou en
  supprimant le compte s'il vient d'être créé par erreur et n'a encore servi
  à rien) par une opération tout aussi ciblée sur ce même `id` exact. Ne
  jamais restaurer une sauvegarde complète pour corriger une seule valeur ou
  un seul compte — disproportionné, et risquerait de perdre d'autres
  écritures légitimes survenues depuis.
- **Opération exécutée sur le mauvais environnement** (ex. production au lieu
  de dev) : ne jamais tenter une correction improvisée. Évaluer l'impact réel
  puis, seulement si nécessaire, suivre la procédure déjà documentée dans
  [RESTORE.md](./RESTORE.md) / [INCIDENTS.md](./INCIDENTS.md) — jamais une
  improvisation en dehors de ces procédures déjà écrites et testées.
- Dans tous les cas : ne jamais exécuter une deuxième commande correctrice
  sans avoir d'abord relu, en lecture seule, l'état réel actuel de la ligne
  concernée.

## 10. Précautions avant une future exécution en production

- Confirmer `DATABASE_URL` de la cible **avant** toute commande (script ou
  manuelle) — jamais supposé, ni par le nom de l'environnement, ni par
  habitude.
- Sauvegarde fraîche de la base de production immédiatement avant
  (`npm run backup -- --export-production=<hôte exact de DATABASE_URL>`),
  résultat vérifié (voir [BACKUP.md](./BACKUP.md)).
- Poser `SAMA_DEPLOY_TARGET_HOST` dans l'environnement du processus, puis
  lancer le script avec `--production --target-host=<même hôte>` (section 4) ;
  ne jamais compter sur le mode local pour une cible distante : il la refuse.
- Exécuter via un canal d'accès officiellement autorisé par l'hébergeur
  retenu — jamais une connexion improvisée dont la traçabilité n'est pas
  garantie.
- Se limiter strictement à l'opération décrite : **un compte, un champ
  (`isPlatformAdmin`)**, jamais une modification supplémentaire "pendant
  qu'on y est".
- Ne jamais transmettre le mot de passe du nouveau compte par un canal non
  sécurisé — le titulaire doit le changer lui-même dès que possible. Pour un
  compte de plateforme, l'action serveur `updateAdminPassword`
  (`src/app/actions/platform-settings.ts`, réservée par
  `requirePlatformAdmin()`) change le mot de passe du compte connecté — sans
  demander l'ancien — et supprime ses autres sessions. `changePassword()`
  (`src/app/actions/settings.ts`) exige l'ancien mot de passe et une session
  valide ; son **accessibilité depuis l'espace plateforme** (formulaire sous
  `src/app/settings/password/`) **n'a pas été vérifiée** : à confirmer.
- Contrôler `permissions` du compte (section 7) : `NULL` donne les pleins
  pouvoirs de plateforme ; décider explicitement si c'est voulu.
- Revérifier les contrôles d'accès de la section 8 avant de considérer
  l'opération terminée.
- Retirer `BOOTSTRAP_PLATFORM_ADMIN_USERNAME`/`_PASSWORD`/`_NAME`/`_CONFIRM`
  de l'environnement une fois le compte créé, même principe que
  `SEED_ADMIN_*`.

## Ce qui N'EST PAS encore défini

- Promotion d'un compte existant en administrateur de plateforme au niveau
  applicatif : non démontrée dans les fichiers examinés (seule la procédure
  manuelle est documentée) — à concevoir si nécessaire, explicitement hors
  périmètre du Lot D12-P63.
- Révocation ou suppression d'un compte de plateforme par l'application : non
  démontrée (`deletePlatformUser` refuse de supprimer un compte de
  plateforme).
- Règles métier de la politique d'approbation d'établissement (qui approuve,
  selon quels critères) : le mécanisme existe dans le code (section 6) mais ses
  règles ne sont pas documentées ici — **à confirmer**.

Aucune règle métier, aucune permission, aucune page utilisateur n'a été
modifiée pour produire ce document ou le script qu'il décrit. Le script
décrit en section 4 n'a jamais été exécuté, ni en mode vérification ni en
mode écriture, par les Lots D12-P62 ou D12-P63 (constat historique de ces
lots ; il ne dit rien d'une exécution ultérieure).
