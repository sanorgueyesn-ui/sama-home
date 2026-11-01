# SAMA HOME — État réel du dépôt et écarts avec la documentation

**Date de l'analyse :** 27 octobre 2026
**Source du code :** `web/prisma/schema.prisma` (branche `work/sama-home-preparation`).
**Portée :** lecture seule. Aucune modification du code ni de la base.

Ce document ne remplace pas une inspection complète avant implémentation. Il relève ce qui est visible dans le schéma Prisma.

## 1. Architecture multi-espaces

| Exigence de la documentation | État dans le schéma | Écart |
|---|---|---|
| Un mode métier par espace (Hôtel, Résidence, Agence) | `Establishment` n'a aucun champ de mode | **Manquant** |
| Un compte peut appartenir à plusieurs espaces | `User.establishmentId` est une clé unique (un compte = un établissement) | **Manquant** : pas de table d'appartenance |
| Rôles attribués par espace | `UserRole` (ADMIN, GESTIONNAIRE) porté par `User` | **À modifier** |
| Sélecteur d'espaces dans le menu du compte | Pas d'espace actif en session | **Manquant** |
| Abonnement lié à l'espace | `Subscription` lié à `Establishment` (`@unique`) | **Conforme** |
| Isolation des données par espace | `establishmentId` sur presque tous les modèles métier | **Conforme** (champ nullable, transitoire) |
| Compte de plateforme distinct de l'admin d'un espace | `isPlatformAdmin` séparé de `role` | **Conforme** |

**Chemin proposé (additif, non destructif)** : table `Membership(userId, establishmentId, role)`, champ `businessMode` sur `Establishment`, espace actif dans `Session`. Les données existantes sont migrées vers un `Membership` et un mode par défaut. À valider sur une base locale isolée.

## 2. Mode Hôtel

| Domaine | État |
|---|---|
| Réservations, locations, prolongations | Modèles présents (`Reservation`, `Rental`, `RentalExtension`) |
| Tarifs et durées | `Tariff`, `DurationUnit` présents |
| Paiements, dépenses | `Payment`, `Expense`, `ExpenseCategory` présents |
| Caisse, virements | `CashRegister`, `CashSession`, `CashCorrection`, `BankAccount`, `BankTransfer` présents |
| Journal d'audit | `AuditLog` présent |
| Ménage, entretien | **Absent** |
| Folio, extras | **Absent** |
| Factures, reçus, bibliothèque PDF | **Aucun modèle de document** |

## 3. Mode Résidence

Il réutilise l'essentiel du socle Hôtel. La différence est surtout dans le vocabulaire (« Nouvelle location » au lieu de « Check-in direct »), les durées flexibles et l'identification client configurable par type de logement.

Il faut trancher **ce qui distingue vraiment Résidence d'Hôtel dans les données** : sans champ de mode, rien ne les sépare aujourd'hui.

## 4. Mode Agence immobilière

Aucun modèle n'existe. Le mode est à concevoir en entier : biens et lots, propriétaires, mandats, annonces, contacts et prospects, visites, baux et échéanciers, commissions, relevés de gérance, reversements, ventes, documents.

Le compteur « biens sous gestion » et le compteur « annonces actives » doivent être deux compteurs distincts, avec des limites propres dans l'abonnement.

## 5. Écarts entre les documents et les maquettes

| Sujet | Constat | Action |
|---|---|---|
| Maquettes Hôtel et Résidence | Même établissement « Hôtel Le Saphir » ; seuls certains libellés changent | Décider ce qui distingue les deux modes |
| Navigation mobile Résidence | `residence.md` : Accueil / Locataires / Biens. La maquette reprend le menu Hôtel | Choisir la source qui fait foi |
| Alertes ménage et entretien (Hôtel) | Affichées sur la maquette, mais le module n'existe pas | Ne pas les livrer tant que le module n'existe pas |
| Dashboard Agence | Ne montre ni mandats, ni annonces, ni propriétaires, ni reversements, ni visites | Compléter la maquette |
| Chiffres des maquettes | Valeurs fictives (3 450 000 FCFA, +12 %) | Remplacer par des données réelles |
| Date des maquettes | « 20 mai 2025 » | Sans effet, c'est une illustration |

## 6. Points techniques à valider avant de coder

- Revalider la disponibilité côté serveur dans une transaction sérialisable (réservation, check-in direct, prolongation).
- Anti-doublon sur les paiements : clé d'idempotence, double clic, renvoi après coupure.
- Montants calculés côté serveur, jamais fournis par le navigateur.
- Séparer les fonds de tiers (loyers des propriétaires, cautions) des revenus de l'agence.
- Hors ligne : projet à part, à ne pas mêler au lot multi-espaces.

## 7. Ordre de travail recommandé

1. Trancher les décisions bloquantes de [04-decisions-ouvertes.md](04-decisions-ouvertes.md).
2. Socle multi-espaces : `Membership`, `businessMode`, espace actif. Migration additive testée en local.
3. Hôtel et Résidence : le socle existe, il reste à les distinguer et à ajouter les documents.
4. Agence, par phases : portefeuille, puis commercial, puis baux et finances.
5. Desktop et hors ligne, après stabilisation.
