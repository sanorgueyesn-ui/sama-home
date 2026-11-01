# SAMA HOME — Documentation produit

Point d'entrée de la documentation de référence. SAMA HOME est **un seul produit** avec **trois modes métier** (Hôtel, Résidence, Agence immobilière), des espaces professionnels indépendants et, comme objectif, une version desktop hors ligne.

> Ces documents décrivent la **cible produit**. Ils ne prouvent pas qu'une fonction est implémentée : voir [03-etat-reel-et-ecarts.md](03-etat-reel-et-ecarts.md) pour la comparaison avec le code.

## Ordre de lecture

| # | Document | À lire pour |
|---|---|---|
| 0 | [00-guide-general.md](00-guide-general.md) | Comprendre le produit, ses règles et les précautions avant de travailler dessus |
| 1 | [01-architecture/inscription-trois-modes.md](01-architecture/inscription-trois-modes.md) | Compte, espaces professionnels, choix et changement de mode |
| 2 | [02-modes/hotel/hotel.md](02-modes/hotel/hotel.md) | Mode Hôtel |
| 2 | [02-modes/residence/residence.md](02-modes/residence/residence.md) | Mode Résidence (chambres et appartements meublés) |
| 2 | [02-modes/agence-immobiliere/agence-immobiliere.md](02-modes/agence-immobiliere/agence-immobiliere.md) | Mode Agence immobilière |
| 3 | [03-etat-reel-et-ecarts.md](03-etat-reel-et-ecarts.md) | Écarts entre la documentation, les maquettes et le code |
| 4 | [04-decisions-ouvertes.md](04-decisions-ouvertes.md) | Registre unique des décisions à prendre |
| 5 | [05-plan-socle-multi-espaces.md](05-plan-socle-multi-espaces.md) | Plan du socle `Membership` + `businessMode` (proposition) |

Chaque dossier de mode contient aussi `maquette-dashboard.png`, la maquette du tableau de bord.

## Légende des statuts (commune à tous les documents)

- **CONFIRMÉ** : décision validée.
- **RECOMMANDATION** : proposition à évaluer.
- **À DÉCIDER / À CONFIRMER** : ne pas inventer de règle.
- **À VÉRIFIER DANS LE CODE** : inspecter le dépôt avant d'agir.

## Règles non négociables (résumé)

1. Tenant et utilisateur toujours issus de la session serveur, jamais du client (voir `AGENTS.md`).
2. Chaque requête métier filtre par espace/établissement ; un bouton masqué ne protège rien.
3. Pas de migration, de seed ni de test sur la base distante sans autorisation explicite.
4. Pas de push ni de déploiement sans autorisation explicite (déploiement automatique).
5. `npm run build` local avant toute publication.
6. Les chiffres affichés viennent des données réelles, jamais de valeurs de démonstration.

## Fichier attendu mais absent

`SAMA_HOME_Rapport_Hors_Ligne_Synchronisation_Web_Installable.md` est cité par le guide général mais n'existe pas dans ce dossier. Il est à retrouver ou à rédiger avant d'étudier le desktop hors ligne.
