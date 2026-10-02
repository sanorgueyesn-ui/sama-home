-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "registeredByUserId" TEXT,
ADD COLUMN     "retroactiveReason" TEXT;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
