-- Socle multi-espaces, lot E : le mode choisi à l'inscription est conservé côté serveur entre
-- l'envoi du code (étape 1) et sa validation (étape 2), au lieu de se perdre.
-- Additive : colonne avec valeur par défaut, les demandes en cours reçoivent 'RESIDENCE'
-- (comportement antérieur). Aucune donnée existante n'est modifiée ni supprimée.
ALTER TABLE "OtpVerification" ADD COLUMN "businessMode" "BusinessMode" NOT NULL DEFAULT 'RESIDENCE';
