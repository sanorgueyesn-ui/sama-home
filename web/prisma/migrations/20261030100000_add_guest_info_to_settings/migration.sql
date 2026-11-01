-- Informations d'accueil du séjour (Wi-Fi, télévision, climatisation, règles, départ), pour les
-- espaces Hôtel et Résidence. Migration ADDITIVE : uniquement de nouvelles colonnes, toutes
-- facultatives (ou avec une valeur par défaut). Aucune donnée existante n'est lue ni modifiée ;
-- les établissements existants ont simplement ces champs vides.
ALTER TABLE "Settings"
  ADD COLUMN "guestWifiName" TEXT,
  ADD COLUMN "guestWifiPassword" TEXT,
  ADD COLUMN "guestTvInstructions" TEXT,
  ADD COLUMN "guestAcInstructions" TEXT,
  ADD COLUMN "guestHouseRules" TEXT,
  ADD COLUMN "guestExtraInfo" TEXT,
  ADD COLUMN "guestCheckoutTime" TEXT,
  ADD COLUMN "guestIncludeEmergency" BOOLEAN NOT NULL DEFAULT false;
