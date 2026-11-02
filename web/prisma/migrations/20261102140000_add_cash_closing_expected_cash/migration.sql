-- Règle de clôture de caisse : l'écart se mesure sur les ESPÈCES du tiroir, pas sur le solde total
-- (espèces + Wave + Orange Money). Migration ADDITIVE : une colonne facultative. Les sessions déjà
-- clôturées gardent NULL et donc leur calcul d'origine ; aucune donnée existante n'est modifiée.
ALTER TABLE "CashSession" ADD COLUMN "closingExpectedCash" INTEGER;
