# SAMA HOME — Registre des décisions ouvertes

Les trois documents de mode et la décision d'architecture listent chacun leurs décisions ouvertes, avec des doublons. Ce registre les regroupe en un seul endroit. Il ne tranche rien : chaque ligne attend une décision.

## Décisions prises par délégation (27 octobre 2026)

Le responsable produit m'a laissé le choix pour les trois points qui bloquent le schéma. Ce sont des choix par défaut, réversibles tant que rien n'est migré : ils restent révisables.

| # | Décision retenue | Raison |
|---|---|---|
| 1 | **Un abonnement par espace professionnel.** Pas d'abonnement multi-modes au lancement | Le schéma le fait déjà (`Subscription.establishmentId` unique). Aucun changement de modèle, et la grille tarifaire reste libre |
| 2 | **Deux rôles au lancement, `ADMIN` et `GESTIONNAIRE`, portés par `Membership` et non par `User`.** Les rôles plus fins (caissier, agent commercial, lecture seule) viennent par mode, plus tard | Réutilise l'enum existant. Évite de figer des rôles avant d'avoir défini les modes |
| 3 | **Hôtel et Résidence partagent le même moteur d'hébergement** (logements, tarifs, réservations, séjours, paiements). `businessMode` change le vocabulaire, la navigation, la checklist d'accueil, les règles d'identification et les modules activés (ménage et caisse pour l'Hôtel). **Les établissements existants passent en `RESIDENCE`** | Le projet existant décrit des logements meublés avec des durées de 2 h, 3 h, 12 h et 24 h, ce qui correspond à la Résidence. Évite de dupliquer le moteur |

Le mode par défaut des établissements existants est la valeur la plus facile à corriger : un simple changement de champ, sans migration de structure.

Les décisions n° 1, 2 et 3 du tableau ci-dessous sont donc **traitées**. Elles restent listées pour mémoire.

Priorité : **Bloquant** = empêche de modéliser le schéma. **Avant lancement** = à régler avant la mise en production. **Plus tard** = peut attendre.

## Architecture et abonnements

| # | Décision | Priorité |
|---|---|---|
| 1 | Un compte peut-il activer plusieurs modes dans un même abonnement, ou un abonnement par espace ? | Bloquant |
| 2 | Rôles et permissions définitifs, attribués par espace | Bloquant |
| 3 | Ce qui distingue Résidence et Hôtel dans les données (pas seulement le vocabulaire) | Bloquant |
| 4 | Nom exact des modes dans le sélecteur (« Agence immobilière » ou autre) | Avant lancement |
| 5 | Grille tarifaire et limites de chaque mode, essai gratuit, période de grâce après impayé | Avant lancement |
| 6 | Les utilisateurs invités sont-ils facturés séparément ? | Avant lancement |

## Règles métier Hôtel et Résidence

| # | Décision | Priorité |
|---|---|---|
| 7 | Statuts et transitions des réservations et séjours | Bloquant |
| 8 | Durées et unités disponibles (heure, nuit, jour, semaine, mois) | Bloquant |
| 9 | Règles d'arrondi, retard, prolongation, départ anticipé et départ tardif | Bloquant |
| 10 | Check-out avec solde impayé : autorisé ou non | Avant lancement |
| 11 | Politique d'annulation, de no-show, d'acompte et de remboursement | Avant lancement |
| 12 | Quand un logement redevient réservable après le départ (ménage inclus ou non) | Avant lancement |
| 13 | Politique d'identification des clients, par chambre et par appartement | Avant lancement |
| 14 | Définition des recettes, de « réservations du jour » et du taux d'occupation | Avant lancement |
| 15 | Ménage, maintenance, caisse et extras : inclus au lancement ou non | Avant lancement |

## Règles métier Agence immobilière

| # | Décision | Priorité |
|---|---|---|
| 16 | Définition d'un bien « sous gestion » et d'une annonce « active » | Bloquant |
| 17 | Règles de commission et de reversement | Bloquant |
| 18 | Suivi seulement des commissions, ou aussi des fonds détenus pour des tiers | Bloquant |
| 19 | Vitrine publique dès la première version ou gestion interne seulement | Avant lancement |
| 20 | Modèles de mandat et de bail : générés par le logiciel ou documents joints | Avant lancement |
| 21 | Agenda partagé des agents dès la première version | Plus tard |

## Documents, paiements et conformité

| # | Décision | Priorité |
|---|---|---|
| 22 | Numérotation, duplicata, annulation et conservation des factures, reçus, quittances et tickets | Avant lancement |
| 23 | Formats (A4, ticket) et imprimantes prises en charge | Avant lancement |
| 24 | Intégrations de paiement (Wave, Orange Money) : saisie manuelle seulement ou API | Avant lancement |
| 25 | Canaux de notification : application, e-mail, SMS, WhatsApp | Plus tard |
| 26 | Obligations légales au Sénégal (hébergement touristique, immobilier, fiscalité, identité) à faire valider | Avant lancement |
| 27 | Durées de conservation des documents et données personnelles | Avant lancement |

## Desktop et hors ligne

| # | Décision | Priorité |
|---|---|---|
| 28 | Technologie d'emballage desktop, versions de Windows et macOS visées | Plus tard |
| 29 | Fonctions autorisées hors ligne (paiements, annulations, reversements) | Plus tard |
| 30 | Stratégie de résolution des conflits et de double réservation | Plus tard |
