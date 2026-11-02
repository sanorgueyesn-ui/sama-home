# Bibliothèque de documents PDF — recherche préalable

**Date :** 1er novembre 2026
**Objet :** préparer une bibliothèque de **contrats de location** (hôtels et résidences) et de **tickets de caisse** (hôtels seulement). Cette note rassemble l'état du code, ce que la recherche a établi, ce qu'elle n'a pas pu établir, et la proposition à valider avant tout développement.
**Statut :** recherche terminée, **rien n'est développé**. Ce n'est pas un avis juridique.

## 1. Limites de cette recherche

Les textes officiels n'ont **pas pu être lus** : le Journal officiel, le décret sur les hébergements, le manuel de la Direction de la réglementation touristique et le guide d'un cabinet d'avocats bloquent la lecture automatique. Tout ce qui suit vient de **sources secondaires** (presse, blogs juridiques, guides fiscaux) qui se recoupent plus ou moins. Chaque point est classé :

- **Recoupé** : au moins deux sources concordantes.
- **Une source** : une seule source, à confirmer.
- **Non trouvé** : aucune information fiable.

Avant la mise en production, un **notaire ou un expert-comptable sénégalais** doit relire les contrats, la TVA et les mentions obligatoires.

## 2. État du code

- **Un seul contrat** : court séjour, 6 articles, `src/lib/contract-pdf.tsx`, servi par `src/app/locations/[id]/contract/route.ts`. Données lues par `src/lib/contract-data.ts` (filtrées par l'établissement de la session).
- **Aucun ticket, reçu ni facture**, aucune table de documents, aucune numérotation, aucun PDF archivé. Le guide Hôtel (§13 et §14) décrit la cible mais laisse les règles « à décider » (§13.4, §20 points 7, 8, 9, 15).
- **Déjà disponible** : `@react-pdf/renderer` (PDF côté serveur), le stockage d'objets compatible S3 (utilisé pour les logos), les paiements (`Payment` : montant, moyen, référence, date) et les couleurs de marque de l'établissement.

**Défauts du contrat actuel à ne pas reprendre :**
1. Si l'établissement n'a pas renseigné ses coordonnées, il affiche **le téléphone, l'adresse et l'e-mail de SAMA HOME** à la place (`contract-data.ts`, « fallback »).
2. Les couleurs du PDF sont fixes : il ne suit pas la palette choisie dans Apparence.
3. Des cases sont cochées en dur (« Espèces », « Transfert mobile », « Séjour / Forfait ») et un règlement « non-fumeur » est imposé à tous.

## 3. Contrats de location

| Point | Information | Fiabilité |
|---|---|---|
| Caution | Pour un loyer jusqu'à 500 000 FCFA/mois : plafonnée à **2 mois**, dont **1 seul payable à l'entrée**, le reste étalé sur 12 mois | Recoupé |
| Paiement du loyer | À **terme échu** (fin de mois), jamais d'avance | Recoupé |
| Frais d'agence | Plafonnés à **un demi-mois** de loyer | Recoupé |
| Texte | Décret n° 2023-382 du 24 février 2023, JO n° 7605 du 28 février 2023, en vigueur le 1er mars 2023. Il modifie le dispositif de la loi n° 2014-03. Commission nationale de régulation du loyer (CONAREL) | Recoupé |
| Baisse des loyers | −15 % jusqu'à 300 000, −10 % de 300 001 à 500 000, −5 % au-delà, pour les loyers non calculés sur la surface corrigée | Recoupé |
| Durée d'un bail d'habitation | Deux formes seulement : **3 ans reconductibles par tacite reconduction triennale**, ou **durée indéterminée** (Code des obligations civiles et commerciales, art. 571) | Une source |
| Bail verbal | Admis, mais un écrit est fortement recommandé | Une source |
| Quittance | Le bailleur remet **une quittance à chaque paiement** et un reçu pour un paiement partiel (art. 582) | Une source |
| État des lieux | Contradictoire à l'entrée et à la sortie (art. 581) | Une source |
| Préavis | Bail de 3 ans : congé 6 mois avant l'échéance. Durée indéterminée : 2 mois pour le locataire | Une source |
| Restitution de la caution | **Aucun délai légal** : à fixer dans le contrat | Recoupé |
| Enregistrement fiscal | Délai, taux, redevable | **Non trouvé** |
| Location meublée de courte ou moyenne durée | Statut juridique au Sénégal | **Non trouvé** |

**Hébergement touristique.** Le décret n° 2005-145 du 2 mars 2005 régit les hôtels, les **résidences hôtelières et les appartements meublés**. L'arrêté n° 14887 du 17 août 2017 en fixe l'application. Le manuel 2025 de la Direction de la réglementation touristique indique que ces établissements tiennent un **registre des transactions financières et des clients (KYC)**. Le contenu exact du registre et l'existence d'une « fiche de police » au sens français sont **non trouvés**.

## 4. Tickets, reçus et factures

| Point | Information | Fiabilité |
|---|---|---|
| TVA | **18 %** normal. **10 %** pour l'hébergement touristique agréé (annoncé) | Une source |
| Facturation électronique | La loi de finances 2025 (n° 2025-02) l'impose aux assujettis à la TVA via un portail public. Les **machines électroniques de facturation** peuvent être autorisées. Amende de 25 % de la TVA, plafonnée à 5 millions FCFA par facture. Conditions fixées par arrêté du ministre des Finances | Une source (Deloitte) |
| Calendrier d'application | Sources contradictoires (réception 2026, émission 2027, ou pas encore d'obligation générale) | **Incertain** |
| Mentions d'une facture | NINEA, numéro séquentiel sans trou, date, détail HT, taux et montant de TVA, TTC, identité du client (B2B) | Blogs commerciaux, **non vérifié** |
| Conservation | 10 ans cité par plusieurs blogs | **Non vérifié** |
| Taxe de séjour | **Aucun barème officiel trouvé**. Un ancien document mentionne 1 000 FCFA/jour/personne | **Non trouvé** |
| Obligation de ticket de caisse certifié | Aucune information fiable | **Non trouvé** |
| Papier thermique | Rouleaux de 58 mm (57,5 ± 0,5 mm) et 80 mm (79,5 ± 0,5 mm), commandes ESC/POS | Fiche technique |

**Conséquence de conception :** puisque la facturation électronique est en route, la numérotation doit être **séquentielle, sans trou**, et chaque document doit conserver une **copie figée** de ses données. Cela prépare une éventuelle transmission à l'administration sans refaire les modèles.

## 5. Proposition

**10 contrats**
1. Hôtel : contrat d'hébergement, court séjour
2. Hôtel : fiche de séjour avec identité du client
3. Hôtel : hébergement entreprise ou groupe
4. Hôtel : conditions générales et règlement intérieur
5. Résidence : bail meublé de 3 ans reconductible
6. Résidence : bail meublé à durée indéterminée
7. Résidence : location meublée de moyenne durée
8. Résidence : chambre meublée ou colocation
9. Avenant (prolongation, loyer, occupants)
10. État des lieux d'entrée et de sortie avec inventaire

**10 tickets** (hôtel seulement ; 58 mm, 80 mm et A4)
1. Arrhes à la réservation
2. Encaissement partiel du séjour
3. Solde de départ
4. Caution encaissée
5. Remboursement de caution
6. Extras (restaurant, blanchisserie…)
7. Prolongation de séjour
8. Passage à l'heure
9. Récapitulatif de séjour
10. Duplicata ou annulation

**Socle technique** : une table de documents (type, numéro séquentiel par établissement, type et année, source, copie figée des données, clé du PDF archivé, statut, auteur, date), un PDF privé jamais exposé par un lien public permanent, des droits vérifiés côté serveur, et une erreur de PDF qui ne modifie jamais la réservation ni le paiement (critères 10, 15 et 16 du guide Hôtel §19).

## 6. Décisions à prendre avant de développer

1. **« 10 modèles »** : 10 types de documents (proposition ci-dessus) ou 10 présentations visuelles du même document ?
2. **Quittance de loyer** pour les résidences : à ajouter à la bibliothèque si la règle de l'art. 582 se confirme ? (Elle est distincte du ticket de caisse, que les résidences n'utilisent pas.)
3. **Validation juridique** par un notaire ou un expert-comptable, avant la production.
4. **Coordonnées de SAMA HOME** dans le contrat d'un autre établissement : à retirer, quelle que soit la suite.
5. **Numérotation** : préfixes, remise à zéro annuelle ou continue.
6. **Taxe de séjour et taux de TVA** : réglables par établissement, avec quelles valeurs par défaut ?
7. **Conservation, duplicata et annulation** : règle retenue.
8. **Imprimantes** prises en charge (58 mm, 80 mm, A4) et calibrage des marges.
9. **Langue** des documents : français seul, ou aussi anglais.

## 7. Sources consultées

- [Senpages — caution, avance et frais d'agence (décret 2023-382)](https://www.senpages.com/dossiers/louer-un-logement/caution-avance-et-frais-dagence)
- [Logestimmo — contrat de bail d'habitation au Sénégal](https://logestimmo.com/blog/contrat-bail-habitation-senegal)
- [Logestimmo — loi sur la location, loyers et caution](https://logestimmo.com/blog/nouvelle-loi-immobiliere-senegal-2024)
- [Magazine Immo Sénégal — qui régule le loyer](https://magazineimmosenegal.com/blog/location-senegal-regulateur)
- [Le Soleil — la dictature des courtiers face à la résignation des locataires](https://lesoleil.sn/le-decodeur/chronique/la-dictature-des-courtiers-face-a-la-resignation-des-locataires/)
- [Décret n° 2005-145 portant réglementation des établissements d'hébergement touristique](https://www.au-senegal.com/IMG/pdf/decret2005-145_portant_reglementation_des_eht.pdf) (lecture bloquée)
- [Manuel de procédures de la Direction de la réglementation touristique 2025](https://www.au-senegal.com/IMG/pdf/manuel_de_procedure_de_la_direction_de_la_reglemen_tationtoutistique.pdf) (lecture bloquée)
- [Deloitte — loi de finances 2025 au Sénégal](https://blog.avocats.deloitte.fr/senegal-les-principales-mesures-importantes-de-la-loi-de-finances-pour-2025/)
- [Kintsugi — guide de la TVA au Sénégal](https://trykintsugi.com/sales-tax-guides/africa/senegal.md)
- [Kolonell — facturation électronique normalisée DGID](https://kolonell.com/fr/blog/facturation-electronique-normalisee-dgid-senegal-2026)

**À consulter directement pour confirmer :** le texte de la loi n° 2014-03 et du décret n° 2023-382 (Journal officiel), l'arrêté n° 14887 du 17 août 2017, le Code général des impôts et l'arrêté d'application de la facturation électronique (DGID).
