-- Identité légale de l'établissement (NINEA, RCCM), imprimée sur ses documents. Migration ADDITIVE :
-- deux colonnes facultatives, aucune donnée existante n'est lue ni modifiée.
ALTER TABLE "Settings" ADD COLUMN "ninea" TEXT, ADD COLUMN "rccm" TEXT;
