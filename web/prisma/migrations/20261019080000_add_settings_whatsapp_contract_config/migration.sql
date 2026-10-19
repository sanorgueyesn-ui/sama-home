-- AlterTable
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsappTemplate" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "contractThresholdDays" INTEGER DEFAULT 1;
