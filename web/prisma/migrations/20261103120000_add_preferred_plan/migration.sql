-- Formule choisie a l'inscription (preference, rien n'est facture). Migration ADDITIVE : colonnes facultatives.
ALTER TABLE "Establishment" ADD COLUMN "preferredPlanTier" "PlanTier", ADD COLUMN "preferredBilling" TEXT;
ALTER TABLE "OtpVerification" ADD COLUMN "preferredPlanTier" "PlanTier", ADD COLUMN "preferredBilling" TEXT;
