-- Paiement en ligne des abonnements (PayDunya) et formule d'abonnement. Migration ADDITIVE :
-- un type et cinq colonnes facultatives, aucune donnee existante n'est lue ni modifiee.
CREATE TYPE "PlanTier" AS ENUM ('ESSENTIAL', 'PRO', 'PREMIUM');

ALTER TABLE "Subscription" ADD COLUMN "planTier" "PlanTier";

ALTER TABLE "SubscriptionPayment"
  ADD COLUMN "planTier" "PlanTier",
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerToken" TEXT;

CREATE UNIQUE INDEX "SubscriptionPayment_providerToken_key" ON "SubscriptionPayment"("providerToken");
