-- Ménage (propreté des unités) et lignes de folio (extras) pour le mode Hôtel.
-- Migration ADDITIVE : un type, deux tables, deux colonnes avec valeur par défaut. Aucune donnée
-- existante n'est lue ni modifiée ; les unités existantes sont « CLEAN » (prêtes) par défaut.
CREATE TYPE "CleaningStatus" AS ENUM ('DIRTY', 'IN_PROGRESS', 'CLEAN');

ALTER TABLE "Property"
  ADD COLUMN "cleaningStatus" "CleaningStatus" NOT NULL DEFAULT 'CLEAN',
  ADD COLUMN "cleaningUpdatedAt" TIMESTAMP(3);

CREATE TABLE "HousekeepingEvent" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "fromStatus" "CleaningStatus",
  "toStatus" "CleaningStatus" NOT NULL,
  "userId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousekeepingEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HousekeepingEvent_propertyId_createdAt_idx" ON "HousekeepingEvent"("propertyId", "createdAt");
CREATE INDEX "HousekeepingEvent_establishmentId_createdAt_idx" ON "HousekeepingEvent"("establishmentId", "createdAt");
ALTER TABLE "HousekeepingEvent" ADD CONSTRAINT "HousekeepingEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousekeepingEvent" ADD CONSTRAINT "HousekeepingEvent_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RentalCharge" (
  "id" TEXT NOT NULL,
  "rentalId" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RentalCharge_amount_nonzero" CHECK ("amount" <> 0)
);
CREATE INDEX "RentalCharge_rentalId_idx" ON "RentalCharge"("rentalId");
CREATE INDEX "RentalCharge_establishmentId_idx" ON "RentalCharge"("establishmentId");
ALTER TABLE "RentalCharge" ADD CONSTRAINT "RentalCharge_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalCharge" ADD CONSTRAINT "RentalCharge_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
