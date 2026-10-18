# Bootstrap du premier administrateur de plateforme

Document produit au Lot D12-P62 (procédure manuelle), mis à jour au Lot
D12-P63 (script dédié). **Le script décrit ici n'a jamais été exécuté — ni en
mode vérification, ni en mode écriture — par aucun des deux lots.** Même
convention que le reste de `docs/production/` : distingue systématiquement ce
qui est **VÉRIFIÉ** (lu réellement dans le code à la date de rédaction) de ce
qui **RESTE À IMPLÉMENTER** ou **N'A PAS ENCORE ÉTÉ EXÉCUTÉ**.

## 1. ADMIN d'établissement vs administrateur de plateforme

Deux autorisations strictement distinctes dans ce projet, jamais fusionnées
nulle part dans le code (vérifié par audit exhaustif, Lots D12-P55 à P61) :

| | `role === "ADMIN"` (établissement) | `isPlatformAdmin === true` |
|---|---|---|
| Portée | Un seul établissement (`User.establishmentId`) | Transverse, aucun établissement par conception |
| Donne accès à | `/settings/users`, `/settings/expense-categories`, etc. (`requireAdmin()`, `src/lib/dal.ts`) | `/plateforme` uniquement (`requirePlatformAdmin()`, même fichier) |
| Peut confirmer un paiement d'abonnement ? | Non, explicitement refusé par `confirmSubscriptionPayment()` même s'il est ADMIN de son propre établissement | Oui, c'est la seule autorisation vérifiée par cette action |
| `establishmentId` | Toujours renseigné | `null` dans l'usage normal prévu par le schéma (voir `model User`, schema.prisma : "NULL pour un compte de plateforme") |

Un compte peut théoriquement cumuler les deux (aucune contrainte en base ne
l'empêche), mais ce n'est **pas** le modèle prévu par la conception actuelle
et complique inutilement le raisonnement de sécurité — voir section 8.

## 2. Prérequis avant le bootstrap

- Accès à la base de données de l'environnement **cible**, soit via les
  variables d'environnement nécessaires au script (section 4), soit via un
  accès direct autorisé pour la procédure manuelle (section 5).
- Confirmation explicite, avant toute commande, de l'environnement réellement
  ciblé (`DATABASE_URL`) — ne jamais supposer qu'il s'agit de dev ou de
  production sans l'avoir vérifié. **Ni le script ni cette documentation ne
  peuvent le déterminer de façon fiable à la place de l'opérateur** (voir
  section 4).
- Une sauvegarde récente et réussie de la base cible (`npm run backup`, voir
  [BACKUP.md](./BACKUP.md)) — avant toute opération en base, script ou
  manuelle, production ou non.
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

Confirmé, comme au Lot D12-P62 :
- `isPlatformAdmin` n'est écrit par **aucune** Server Action ni page de
  l'application — seul `scripts/bootstrap-platform-admin.mts` (hors de
  l'application, jamais lancé automatiquement) et la procédure manuelle
  l'écrivent.
- `prisma/seed.ts` reste un mécanisme **distinct et non substituable** : il
  crée un `role: "ADMIN"` sans établissement et sans jamais définir
  `isPlatformAdmin` — `scripts/bootstrap-platform-admin.mts` refuse
  explicitement de créer un compte dont l'identifiant coïnciderait avec
  `SEED_ADMIN_USERNAME`, pour qu'aucune confusion entre les deux ne soit
  jamais possible.

## 4. Procédure recommandée : script dédié

### Mode sans écriture (par défaut)

```bash
npx tsx scripts/bootstrap-platform-admin.mts
# ou : npm run bootstrap:platform-admin
```

N'écrit jamais rien en base, quelle que soit l'issue. Vérifie, dans l'ordre,
**avant toute connexion à la base** :
1. `DATABASE_URL` définie.
2. `BOOTSTRAP_PLATFORM_ADMIN_USERNAME` / `_PASSWORD` / `_NAME` définies (voir
   `.env.example`).
3. `BOOTSTRAP_PLATFORM_ADMIN_USERNAME` ne coïncide pas avec
   `SEED_ADMIN_USERNAME`.

Puis affiche l'hôte:port de `DATABASE_URL` (jamais les identifiants de
connexion), se connecte, vérifie qu'aucun compte n'existe déjà pour cet
identifiant, et affiche un résumé de ce qui **serait** créé — sans rien
écrire.

### Confirmation nécessaire à la création (mode écriture)

```bash
npx tsx scripts/bootstrap-platform-admin.mts --write
```

En plus des trois vérifications ci-dessus, exige **une variable
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

**Limite assumée, documentée plutôt que contournée par une fausse
garantie** : ce script ne peut pas déterminer de façon fiable si
`DATABASE_URL` pointe vers le développement ou la production — un nom
d'hôte ne le prouve jamais à lui seul. Aucune vérification automatique de ce
type n'est tentée ; la vérification de l'hôte/port affichés avant `--write`
reste une responsabilité humaine.

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
   SELECT id, username, role, "establishmentId", "isPlatformAdmin"
   FROM "User"
   WHERE username = '<identifiant exact, vérifié au clavier>';
   ```
   Confirmer qu'une seule ligne est retournée et que son contenu correspond
   bien au compte attendu avant de continuer.
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
  opposition à la création d'un nouveau compte) au niveau applicatif —
  aujourd'hui, seule la procédure manuelle (section 5) le permet. Le lot
  D12-P63 interdit explicitement de créer "une fonctionnalité de promotion
  arbitraire de comptes existants" dans le script — une telle fonctionnalité
  nécessiterait sa propre conception de sécurité dédiée (qui peut promouvoir
  qui, avec quelles traces d'audit), hors périmètre de ce lot.
- Une interface de gestion des comptes de plateforme (liste, promotion,
  révocation), elle-même réservée à un administrateur de plateforme déjà
  actif — ce qui ne résout le problème que pour les opérations *suivantes*,
  jamais pour la toute première (problème de bootstrap circulaire inhérent à
  ce genre de système, résolu aujourd'hui par le script/la procédure
  manuelle hors application).
- Une politique d'approbation d'établissement opérationnelle
  (`Establishment.status` : `PENDING` → `ACTIVE`), aujourd'hui absente du
  code applicatif.

## 7. Vérifications pour confirmer `isPlatformAdmin`

Que la création vienne du script (section 4) ou de la procédure manuelle
(section 5), en **lecture seule**, toujours filtrée par le même `id` exact :

```sql
SELECT id, username, role, "establishmentId", "isPlatformAdmin", "passwordHash"
FROM "User"
WHERE id = '<même id exact>';
```

Confirmer :
- `isPlatformAdmin` vaut bien `true`.
- `role` et `establishmentId` sont bien `NULL` (création via le script) ou
  strictement inchangés par rapport à l'état attendu (promotion manuelle
  d'un compte existant).
- Une seule ligne est retournée.

Ne jamais exécuter une requête large (`WHERE "isPlatformAdmin" = true` sans
filtre sur un `id` précis) sur un terminal partagé ou journalisé — cela
afficherait potentiellement d'autres comptes à une personne qui n'a pas
besoin de les voir pour cette opération.

## 8. Contrôles d'accès à vérifier après création

- Connexion réelle avec ce compte → accès à `/plateforme` réussi (plus de
  redirection vers `/` par `requirePlatformAdmin()`).
- Le lien "Espace plateforme" apparaît dans la navigation (D12-P61).
- Si ce compte n'a pas aussi `role === "ADMIN"` d'un établissement : confirmer
  qu'il est bien redirigé vers `/` par `requireAdmin()` sur toute page
  réservée (`/settings/users`, etc.) — aucun privilège d'établissement ne
  doit avoir été accordé implicitement par cette opération.
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
- Sauvegarde fraîche (`npm run backup`) immédiatement avant, résultat
  vérifié (voir [BACKUP.md](./BACKUP.md)).
- Exécuter via un canal d'accès officiellement autorisé par l'hébergeur
  retenu — jamais une connexion improvisée dont la traçabilité n'est pas
  garantie.
- Se limiter strictement à l'opération décrite : **un compte, un champ
  (`isPlatformAdmin`)**, jamais une modification supplémentaire "pendant
  qu'on y est".
- Ne jamais transmettre le mot de passe du nouveau compte par un canal non
  sécurisé — le titulaire doit le définir ou le changer lui-même dès que
  possible via le changement de mot de passe déjà existant dans
  l'application (`changePassword()`, `src/app/actions/settings.ts`).
- Revérifier les contrôles d'accès de la section 8 avant de considérer
  l'opération terminée.
- Retirer `BOOTSTRAP_PLATFORM_ADMIN_USERNAME`/`_PASSWORD`/`_NAME`/`_CONFIRM`
  de l'environnement une fois le compte créé, même principe que
  `SEED_ADMIN_*`.

## Ce qui N'EST PAS encore défini

- Aucune fonctionnalité applicative de promotion d'un compte existant — **à
  implémenter**, explicitement hors périmètre du Lot D12-P63.
- Aucune interface de gestion des comptes de plateforme (liste, promotion,
  révocation) — **à implémenter**.
- Aucune politique d'approbation d'établissement opérationnelle — **à
  implémenter**.

Aucune règle métier, aucune permission, aucune page utilisateur n'a été
modifiée pour produire ce document ou le script qu'il décrit. Le script
décrit en section 4 n'a jamais été exécuté, ni en mode vérification ni en
mode écriture, par les Lots D12-P62 ou D12-P63.
