# Mise en ligne du lot du 2 novembre 2026

**Statut : procédure préparée, RIEN n'a été exécuté.** Aucune migration n'a touché une base distante, rien n'a été poussé sur GitHub. Ce document complète [DEPLOY.md](./DEPLOY.md), [BACKUP.md](./BACKUP.md), [RESTORE.md](./RESTORE.md) et [ROLLBACK.md](./ROLLBACK.md) : en cas de doute, ces quatre documents font foi pour les commandes.

Ce qui n'a PAS pu être vérifié depuis le poste de développement, et qu'il faut contrôler avant de commencer : l'état réel de la base de production, la configuration de l'hébergeur (déploiement automatique ou non, branche suivie), les variables d'environnement de production, le stockage des logos.

---

## 1. Ce que contient le lot

Seize commits locaux depuis `25e3471`, le dernier commit poussé vers la sauvegarde privée (liste : `git log --oneline 25e3471..HEAD`). Les branches locales sont `main` et `work/sama-home-preparation` ; les dépôts distants sont `origin` (public), `private` (sauvegarde privée) et `old-origin`. Quelle branche l'hébergeur suit, il faut le vérifier chez lui. En résumé :

| Sujet | Effet visible | Touche la base ? |
|---|---|---|
| Paramètres en onglets, messages WhatsApp, couleurs unifiées | Interface des réglages, texte d'accueil | Non (colonnes d'accueil déjà dans la migration du 30/10) |
| Mode Agence suspendu | Un espace Agence affiche « suspendu », données conservées | Non |
| Contrat de location | **Refuse** de se générer si les coordonnées de l'établissement sont incomplètes, et redirige vers les réglages | Non |
| Bibliothèque de documents (galerie, choix, ticket réel) | Nouvelle page Paramètres → Documents, ticket de caisse par paiement (hôtel) | Oui (3 colonnes) |
| Pages au style du tableau de bord, vocabulaire hôtel/résidence | Toutes les pages principales | Non |
| Hôtel : ménage, extras de séjour, planning, indicateurs | Nouvelles pages et blocs, réservés au mode Hôtel | Oui (2 tables, 2 colonnes) |
| Caisse : clôture sur les espèces du tiroir | Règle de l'écart modifiée | Oui (1 colonne) |

## 2. Migrations à appliquer

Sept migrations sont en attente depuis la dernière mise en ligne connue (`20261023120000`). **Confirmer la liste exacte avec la base de production** avant de commencer :

```text
npx prisma migrate status --config scripts/deploy/prisma-deploy.config.ts
```

| Migration | Nature | Risque |
|---|---|---|
| `20261027100000_add_membership_business_mode` | Type, table `Membership`, colonnes `businessMode` et `activeEstablishmentId`, rétro-remplissage des appartenances | Additive. Écrit des lignes dans `Membership` (une par compte avec établissement et rôle) |
| `20261028100000_replay_membership_backfill` | Rejoue le rétro-remplissage, sans doublon | Données seulement |
| `20261029100000_add_otp_business_mode` | Colonne avec valeur par défaut sur `OtpVerification` | Additive |
| `20261030100000_add_guest_info_to_settings` | 8 colonnes facultatives sur `Settings` | Additive |
| `20261102100000_add_housekeeping_and_rental_charges` | Type, 2 tables, 2 colonnes sur `Property` | Additive. Contrainte `RentalCharge.amount <> 0` |
| `20261102140000_add_cash_closing_expected_cash` | 1 colonne facultative sur `CashSession` | Additive |
| `20261102160000_add_document_presentation_to_settings` | 3 colonnes avec valeur par défaut sur `Settings` | Additive |

Aucune migration ne supprime ni ne modifie de donnée existante. Les ajouts de colonne avec valeur par défaut constante sont instantanés sur PostgreSQL 11 et plus.

## 3. Règle d'or : la base d'abord, le code ensuite

Le nouveau code lit les nouvelles colonnes (par exemple toute page qui lit les réglages lit `documentContractTheme`). **Si le code est mis en ligne avant les migrations, l'application entière tombe en erreur.** À l'inverse, l'ancien code fonctionne avec le nouveau schéma, car tout est additif.

Conséquences :

1. Appliquer les migrations **avant** de mettre le code en ligne.
2. **Danger : déploiement automatique.** Le guide du projet indique que le dépôt GitHub déclenche un déploiement automatique. Un `git push` mettrait alors le code en ligne avant les migrations. Vérifier chez l'hébergeur quelle branche est suivie et si une commande de migration est lancée au démarrage (voir DEPLOY.md, « À vérifier avant le prochain déploiement »). Ne pousser qu'une fois les migrations appliquées.
3. `origin` est un dépôt **public** : ne rien y pousser qui ne soit publiable. Les captures d'écran de test (`web/public/*screenshot*.png`) ne sont pas commitées et ne doivent pas l'être.

## 4. Avant de commencer (liste de contrôle)

- [ ] Décisions du propriétaire prises (section 8).
- [ ] `npm test` : 604 tests passent. `npm run build` réussit. `tsc --noEmit` réussit.
- [ ] `git status` propre, sauf les captures de test ; relire `git diff --stat <dernier commit en ligne>..HEAD`.
- [ ] Hôte exact de la base de production connu (`SAMA_DEPLOY_TARGET_HOST`).
- [ ] Hébergeur : branche suivie, commande de démarrage, variables d'environnement, accès aux journaux.
- [ ] Créneau choisi hors des heures d'usage (la clôture de caisse change de règle : voir section 7).
- [ ] Une personne joignable pour tester après la mise en ligne.

## 5. Procédure

```text
1. Sauvegarde de production (obligatoire, voir BACKUP.md) :
   npm run backup -- --export-production=<hôte exact de DATABASE_URL>
   Contrôler la taille du fichier et le message d'intégrité.
   Ne pas continuer si la sauvegarde a échoué.

2. Variables posées dans l'environnement du processus (jamais lues depuis .env) :
   DATABASE_URL, SAMA_DEPLOY_TARGET_HOST (même hôte), SAMA_ENV différent de « local ».

3. Migrations :
   npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts
   npx prisma migrate status --config scripts/deploy/prisma-deploy.config.ts
   → « Database schema is up to date ». En cas d'échec : ne rien relancer à l'aveugle, voir ROLLBACK.md, cas B.

4. Contrôle SQL rapide (lecture seule) :
   - SELECT count(*) FROM "Membership";  -- égal au nombre de comptes avec établissement et rôle
   - SELECT "businessMode", count(*) FROM "Establishment" GROUP BY 1;  -- tout est « RESIDENCE » par défaut
   - Les colonnes "Property"."cleaningStatus" et "Settings"."documentContractTheme" existent.

5. Mise en ligne du code (push ou déploiement manuel, selon l'hébergeur).
   Attendre la fin du build.

6. GET /api/health → {"status":"ok"}.

7. Tests de fumée (section 6).
```

## 6. Tests de fumée après mise en ligne

Avec un compte administrateur d'un établissement **Résidence**, puis d'un établissement **Hôtel** :

| Test | Attendu |
|---|---|
| Connexion, tableau de bord | Page affichée, couleurs de l'établissement |
| Locations, Réservations, Clients, Logements, Dépenses | Listes et vocabulaire du bon mode (résidence : locataire, location ; hôtel : client, séjour, check-in direct) |
| Nouvelle réservation, nouveau logement, tarif | Formulaires enregistrent sans erreur |
| Fiche d'une location en cours (résidence) | Décompte qui défile, pas d'erreur « Maximum update depth » |
| Paramètres → Documents (admin) | Galerie, agrandissement, bouton « Utiliser » |
| Contrat d'une location, coordonnées complètes puis incomplètes | PDF dans le premier cas ; redirection vers les réglages dans le second |
| **Hôtel** : Ménage, Planning | Pages affichées ; terminer un séjour passe la chambre « à nettoyer » |
| **Hôtel** : extra sur un séjour en cours | Total et solde mis à jour, formulaire vidé |
| **Hôtel** : ticket de caisse d'un paiement | PDF d'une page, coordonnées réelles |
| **Hôtel** : Rapports | Occupation, recette par nuit occupée |
| **Résidence** : accès direct à /menage, /planning, ticket | Redirection ou erreur 404 |
| Caisse : ouvrir, encaisser en Wave, clôturer en comptant les espèces | « Aucun écart » ; ouverture suivante proposée avec le Wave conservé |

Un établissement Hôtel existant a `businessMode = RESIDENCE` par défaut : les pages hôtel restent invisibles tant que le mode n'est pas corrigé (voir la décision 3, section 8).

## 7. Changements de comportement à annoncer au personnel

1. **Clôture de caisse** : le comptage physique se compare désormais aux **espèces attendues au tiroir** (sans Wave ni Orange Money). Avant, il se comparait au solde total, ce qui créait un faux écart dès qu'un paiement passait par le mobile. Les sessions déjà clôturées gardent leur calcul d'origine.
2. **Première ouverture de caisse après la mise en ligne** : si la dernière session a été clôturée avant la mise en ligne, le solde d'ouverture proposé suit l'ancienne règle (le comptage seul). À partir de la première clôture sous la nouvelle règle, le solde proposé est le solde théorique corrigé de l'écart d'espèces.
3. **Contrat de location** : il n'est plus généré avec des coordonnées inventées. Si les coordonnées de l'établissement sont incomplètes, l'utilisateur est renvoyé vers Paramètres → Établissement.
4. **Mode Agence** : suspendu. Un espace Agence existant affiche un message, ses données sont conservées.
5. **Interface** : toutes les pages principales ont changé d'aspect et certains libellés ont changé selon le mode.

## 8. Décisions du propriétaire, avant de commencer

1. **Documents juridiques** : les contrats et quittances de la bibliothèque sont des **aperçus avec données d'exemple**, marqués « sans valeur ». Ils ne sont pas branchés sur les vraies locations. Ils doivent être relus par un notaire ou un comptable sénégalais avant tout usage réel (voir `RECHERCHE_BIBLIOTHEQUE_DOCUMENTS.md`).
2. **Numérotation des tickets** : le ticket affiche une référence provisoire (6 derniers caractères de l'identifiant du paiement). Ce n'est pas une numérotation officielle. Choisir un format et une règle avant de s'en servir comme justificatif.
3. **Mode des établissements existants** : les hôtels déjà inscrits doivent passer en mode Hôtel, par une mise à jour ciblée et décidée établissement par établissement :
   `UPDATE "Establishment" SET "businessMode" = 'HOTEL' WHERE id = '<identifiant>';`
   Ne jamais l'exécuter sans identifiant.
4. **Règle de caisse** : confirmer que la règle « espèces du tiroir » est bien celle voulue pour tous les établissements.

## 9. Retour arrière

Voir ROLLBACK.md. Points propres à ce lot :

- **Code** : revenir à la version précédente. Elle fonctionne avec le nouveau schéma, car tout est additif.
- **Base** : ne pas défaire les migrations. En particulier, **ne pas supprimer la table `RentalCharge`** : le montant d'un séjour (`Rental.amount`) inclut déjà ses extras. La supprimer laisserait des totaux gonflés sans trace de leur origine. Les nouvelles colonnes et tables peuvent rester vides et inutilisées sans effet.
- **Restauration de la sauvegarde** : seulement en cas de corruption des données (ROLLBACK.md, cas C). Elle fait perdre tout ce qui a été saisi depuis la sauvegarde.
- **Clôture de caisse** : si la nouvelle règle pose problème, le retour du code redonne l'ancien calcul pour les nouvelles clôtures. Les sessions clôturées entre-temps gardent la valeur `closingExpectedCash` : elles restent lisibles par l'ancien code, qui les compare au solde total.

## 10. Après la mise en ligne

- Surveiller les journaux de l'application pendant 24 heures (erreurs 500, erreurs de base).
- Faire clôturer et rouvrir la caisse une fois par un administrateur, en présence de la personne qui l'utilise.
- Vérifier la sauvegarde suivante (BACKUP.md) et noter la date dans INCIDENTS.md s'il y a eu un incident.

## 11. Limites connues du lot (déjà signalées)

- Les actions serveur (extras, ménage, clôture de caisse) sont couvertes par des tests de règles pures et par des essais manuels, pas par des tests automatiques sur base de données.
- Deux erreurs `eslint` antérieures restent : `src/app/actions/properties.ts` (type `any`) et `src/app/locations/rental-form.tsx` (état modifié dans un effet).
- Les pages de la plateforme (administration) et des paramètres n'ont pas été refondues.
- Contrats et quittances réels, factures, numérotation et conservation des PDF : non développés.
