-- CreateEnum
CREATE TYPE "EstablishmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "establishmentId" TEXT,
ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "RentalExtension" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "CashRegister" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "CashSession" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "CashCorrection" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "BankTransfer" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "TransferSchedule" ADD COLUMN     "establishmentId" TEXT;

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EstablishmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "event" TEXT NOT NULL,
    "relatedEstablishmentId" TEXT,
    "recipientEmail" TEXT,
    "subject" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("notificationId","userId")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "trialStartedAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "reminderSentForPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodMonths" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "confirmedByUserId" TEXT,
    "periodStartedAt" TIMESTAMP(3),
    "periodEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "trialDurationMonths" INTEGER NOT NULL DEFAULT 2,
    "periodMonths" INTEGER NOT NULL DEFAULT 3,
    "periodPriceFcfa" INTEGER NOT NULL DEFAULT 9900,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint
ALTER TABLE "PricingSettings" ADD CONSTRAINT "PricingSettings_singleton_check" CHECK ("id" = 'singleton');

-- CreateIndex
CREATE INDEX "Establishment_status_idx" ON "Establishment"("status");

-- CreateIndex
CREATE INDEX "Notification_channel_status_idx" ON "Notification"("channel", "status");

-- CreateIndex
CREATE INDEX "Notification_relatedEstablishmentId_idx" ON "Notification"("relatedEstablishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_establishmentId_key" ON "Subscription"("establishmentId");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_idx" ON "SubscriptionPayment"("status");

-- CreateIndex
CREATE INDEX "User_establishmentId_idx" ON "User"("establishmentId");

-- CreateIndex
CREATE INDEX "Client_establishmentId_idx" ON "Client"("establishmentId");

-- CreateIndex
CREATE INDEX "Property_establishmentId_idx" ON "Property"("establishmentId");

-- CreateIndex
CREATE INDEX "Tariff_establishmentId_idx" ON "Tariff"("establishmentId");

-- CreateIndex
CREATE INDEX "Reservation_establishmentId_idx" ON "Reservation"("establishmentId");

-- CreateIndex
CREATE INDEX "Rental_establishmentId_idx" ON "Rental"("establishmentId");

-- CreateIndex
CREATE INDEX "RentalExtension_establishmentId_idx" ON "RentalExtension"("establishmentId");

-- CreateIndex
CREATE INDEX "Payment_establishmentId_idx" ON "Payment"("establishmentId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_establishmentId_idx" ON "ExpenseCategory"("establishmentId");

-- CreateIndex
CREATE INDEX "Expense_establishmentId_idx" ON "Expense"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_establishmentId_key" ON "Settings"("establishmentId");

-- CreateIndex
CREATE INDEX "AuditLog_establishmentId_idx" ON "AuditLog"("establishmentId");

-- CreateIndex
CREATE INDEX "CashRegister_establishmentId_idx" ON "CashRegister"("establishmentId");

-- CreateIndex
CREATE INDEX "CashSession_establishmentId_idx" ON "CashSession"("establishmentId");

-- CreateIndex
CREATE INDEX "CashCorrection_establishmentId_idx" ON "CashCorrection"("establishmentId");

-- CreateIndex
CREATE INDEX "BankAccount_establishmentId_idx" ON "BankAccount"("establishmentId");

-- CreateIndex
CREATE INDEX "BankTransfer_establishmentId_idx" ON "BankTransfer"("establishmentId");

-- CreateIndex
CREATE INDEX "TransferSchedule_establishmentId_idx" ON "TransferSchedule"("establishmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalExtension" ADD CONSTRAINT "RentalExtension_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCorrection" ADD CONSTRAINT "CashCorrection_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferSchedule" ADD CONSTRAINT "TransferSchedule_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_relatedEstablishmentId_fkey" FOREIGN KEY ("relatedEstablishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
