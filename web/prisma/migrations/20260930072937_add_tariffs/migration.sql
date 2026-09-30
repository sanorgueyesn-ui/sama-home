-- CreateEnum
CREATE TYPE "TariffType" AS ENUM ('HEURE', 'NUIT', 'JOUR', 'SEMAINE', 'MOIS');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('HOURS', 'NIGHT', 'DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TariffType" NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "DurationUnit" NOT NULL,
    "amount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tariff_propertyId_idx" ON "Tariff"("propertyId");

-- CreateIndex
CREATE INDEX "Tariff_propertyId_active_idx" ON "Tariff"("propertyId", "active");

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
