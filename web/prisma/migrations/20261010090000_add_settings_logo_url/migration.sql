-- Lot "Apparence & Logo" : logo propre de l'établissement (URL collée,
-- même convention que Property.photo — pas d'upload de fichier).
ALTER TABLE "Settings" ADD COLUMN "logoUrl" TEXT;
