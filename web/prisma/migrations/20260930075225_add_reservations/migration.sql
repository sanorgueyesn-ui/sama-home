-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'ARRIVED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'WAVE', 'ORANGE_MONEY', 'OTHER');

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "DurationUnit" NOT NULL,
    "amount" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "depositMethod" "PaymentMethod",
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_propertyId_status_idx" ON "Reservation"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Reservation_clientId_idx" ON "Reservation"("clientId");

-- CreateIndex
CREATE INDEX "Reservation_arrivalTime_idx" ON "Reservation"("arrivalTime");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
