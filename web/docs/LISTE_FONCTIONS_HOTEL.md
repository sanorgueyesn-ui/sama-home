# SAMA HOME — Fonctions hôtelières à choisir

**Date :** 2 novembre 2026
**Statut :** liste de recherche, **aucune fonction n'est validée**. Les recherches web viennent de pages de vendeurs et de blogs : à vérifier avec des démonstrations.
**Voir aussi :** `NOUVEAUS GUIDE SAMA HOME/02-modes/hotel/hotel.md` (§18 recommandations), `03-etat-reel-et-ecarts.md` (§2 état du schéma).

## 1. Déjà dans SAMA HOME (modèles présents)

- Réservations, séjours, prolongations, tarifs par durée.
- Paiements et acomptes, dépenses.
- Caisse (sessions, corrections), virements bancaires.
- Journal d'audit.
- Documents PDF (contrats, tickets, quittances) : bibliothèque en construction, voir `RECHERCHE_BIBLIOTHEQUE_DOCUMENTS.md`.

## 2. Fonctions fréquentes chez les logiciels hôteliers

### Le plus utile pour un hôtel sénégalais

| # | Fonction | Ce que ça apporte |
|---|---|---|
| 1 | Ménage (housekeeping) | Statuts propre, sale, en inspection, bloquée. Mise à jour depuis le téléphone, tâche créée au départ du client. |
| 2 | Folio (compte de séjour) | Hébergement, extras (restaurant, blanchisserie, minibar), paiements et solde dans un seul compte. Facture finale, paiement partagé pour un groupe. |
| 3 | Clôture de caisse par équipe | Ouverture et fermeture, montant attendu contre montant compté, écart. Espèces et mobile money séparés. Les sessions de caisse existent déjà : il reste le rapport d'écart. |
| 4 | Moyens de paiement locaux | Espèces, Wave, Orange Money, virement, carte, avec une référence enregistrée pour chaque paiement. |
| 5 | Clôture de journée (night audit) | Contrôle des arrivées, départs, encaissements et dépenses, puis verrouillage du jour. |
| 6 | Grille des chambres (planning) | Vue calendrier par chambre, blocage pour travaux, déplacement, changement de chambre. |

### Réservations et tarifs

| # | Fonction | Ce que ça apporte |
|---|---|---|
| 7 | Plans tarifaires | Saison haute et basse, tarif entreprise, promotions, tarif à l'heure ou à la nuit. |
| 8 | Réservations de groupe | Blocs de chambres, liste d'occupants, check-in et check-out en groupe. |
| 9 | Annulation, no-show, départ anticipé ou tardif | Statuts clairs et règle pour l'acompte. Les pénalités restent à décider. |
| 10 | Fiche client avec historique | Séjours passés, pièce d'identité, notes. |
| 11 | Fiche de police / registre des voyageurs | Aucune source consultée n'en parle : obligation locale à vérifier pour le Sénégal. |

### Gestion et pilotage

| # | Fonction | Ce que ça apporte |
|---|---|---|
| 12 | Indicateurs hôteliers | Taux d'occupation, prix moyen par chambre louée (ADR), revenu par chambre disponible (RevPAR), recettes par moyen de paiement. |
| 13 | Maintenance | Pannes par chambre, chambre « hors service », historique des interventions. |
| 14 | Rôles et droits | Réception, ménage, comptable, directeur. |
| 15 | Messages au client | Confirmation, bienvenue, rappel de départ par WhatsApp (une partie existe déjà). |

### Plus tard, plus lourd

| # | Fonction | Ce que ça apporte |
|---|---|---|
| 16 | Channel manager et réservation en ligne | Synchronisation avec Booking, Airbnb, site propre. |
| 17 | Restaurant, bar, boutique (point de vente) | Commandes imputées à la chambre. |
| 18 | Mode hors ligne | Projet à part (voir le guide). |

## 3. Recommandation pour un premier lot

Points **1, 2, 3**, puis **6** et **12**. Les points 1 et 2 demandent de modifier le schéma Prisma : migration additive, testée sur une base locale uniquement, jamais sur la base distante sans autorisation.

Les points 1, 2, 3, 5 et 6 sont des « recommandations à valider » dans le guide Hôtel : ils ne passent en production qu'avec une décision explicite.

## 4. Décisions à prendre

- Quels numéros garder, et dans quel ordre.
- Règles : départ avec solde impayé, pénalités d'annulation et de no-show, arrondis des tarifs.
- Obligations légales sénégalaises sur le registre des voyageurs et les factures.

## Sources

- Hotelogix, checklist PMS : https://www.hotelogix.com/blog/hotel-pms-checklist
- Cloudbeds, 8 fonctions d'un PMS : https://cloudbeds.com/articles/8-functions-your-property-management-system-needs
- Mews contre Cloudbeds : https://www.mews.com/en/compare/mews-vs-cloudbeds
- OakProperty (PMS, Tanzanie) : https://www.oakpms.duckdns.org/
- Hanmak Loyon (PMS, Kenya) : https://www.hanmak.co.ke/products/loyon-hotel-system/
- SabeeApp, gestion de caisse : https://www.sabeeapp.com/hotel-cash-management-system
- Kolonell, logiciels pour l'Afrique francophone : https://kolonell.com/en/blog/hospitality-management-software-francophone-africa-2026
- Hotelogix, liste complète des fonctions : https://hotelogix.com/all-feature-list
- AltexSoft, produits et fonctions des PMS : https://www.altexsoft.com/blog/travel/hotel-property-management-systems-products-and-features/
