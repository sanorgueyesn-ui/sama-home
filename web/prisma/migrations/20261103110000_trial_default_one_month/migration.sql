-- Essai gratuit : 1 mois (regle confirmee). Ne change que la valeur par defaut des NOUVELLES lignes ;
-- la ligne existante de PricingSettings, s'il y en a une, n'est pas modifiee (a regler dans Plateforme > Parametres).
ALTER TABLE "PricingSettings" ALTER COLUMN "trialDurationMonths" SET DEFAULT 1;
