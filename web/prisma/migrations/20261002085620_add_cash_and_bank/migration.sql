-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'EFFECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TransferAmountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" INTEGER NOT NULL,
    "openingIsManual" BOOLEAN NOT NULL DEFAULT false,
    "openingReason" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" TEXT NOT NULL,
    "closingTheoreticalBalance" INTEGER,
    "physicalCount" INTEGER,
    "variance" INTEGER,
    "varianceReason" TEXT,
    "closeNote" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCorrection" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "maskedAccountNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "BankTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "effectedAt" TIMESTAMP(3),
    "reference" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "effectedByUserId" TEXT,
    "cashSessionId" TEXT,
    "transferScheduleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferSchedule" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "frequency" "TransferFrequency" NOT NULL,
    "amountType" "TransferAmountType" NOT NULL,
    "fixedAmount" INTEGER,
    "percentage" INTEGER,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashRegister_active_idx" ON "CashRegister"("active");

-- CreateIndex
CREATE INDEX "CashSession_cashRegisterId_status_idx" ON "CashSession"("cashRegisterId", "status");

-- CreateIndex
CREATE INDEX "CashSession_openedAt_idx" ON "CashSession"("openedAt");

-- CreateIndex
CREATE INDEX "CashSession_closedAt_idx" ON "CashSession"("closedAt");

-- CreateIndex
CREATE INDEX "CashCorrection_cashSessionId_idx" ON "CashCorrection"("cashSessionId");

-- CreateIndex
CREATE INDEX "CashCorrection_userId_idx" ON "CashCorrection"("userId");

-- CreateIndex
CREATE INDEX "BankAccount_active_idx" ON "BankAccount"("active");

-- CreateIndex
CREATE INDEX "BankTransfer_bankAccountId_idx" ON "BankTransfer"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankTransfer_cashSessionId_idx" ON "BankTransfer"("cashSessionId");

-- CreateIndex
CREATE INDEX "BankTransfer_status_idx" ON "BankTransfer"("status");

-- CreateIndex
CREATE INDEX "BankTransfer_transferScheduleId_idx" ON "BankTransfer"("transferScheduleId");

-- CreateIndex
CREATE INDEX "TransferSchedule_bankAccountId_idx" ON "TransferSchedule"("bankAccountId");

-- CreateIndex
CREATE INDEX "TransferSchedule_active_nextRunAt_idx" ON "TransferSchedule"("active", "nextRunAt");

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCorrection" ADD CONSTRAINT "CashCorrection_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCorrection" ADD CONSTRAINT "CashCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_effectedByUserId_fkey" FOREIGN KEY ("effectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_transferScheduleId_fkey" FOREIGN KEY ("transferScheduleId") REFERENCES "TransferSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferSchedule" ADD CONSTRAINT "TransferSchedule_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferSchedule" ADD CONSTRAINT "TransferSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bloc 17.2, Étape B — contraintes au-delà de ce que le DSL Prisma exprime
-- nativement (pas de previewFeatures d'index partiel dans ce projet), même
-- technique que "Payment_context_check" (migration add_payments) : écrites
-- à la main, jamais comptées uniquement sur Zod pour ces invariants
-- critiques (Bloc 17.2, Bloc 22).

-- CashSession : une seule session OPEN par caisse. Index unique PARTIEL
-- (WHERE status = 'OPEN') — une caisse peut avoir un nombre illimité de
-- sessions CLOSED, mais jamais plus d'une OPEN simultanément.
CREATE UNIQUE INDEX "CashSession_one_open_per_register" ON "CashSession"("cashRegisterId") WHERE "status" = 'OPEN';

-- CashSession : cohérence clôture/statut — OPEN implique les 3 champs de
-- clôture tous NULL, CLOSED implique les 3 tous renseignés. Empêche un état
-- intermédiaire incohérent même en cas de bug applicatif.
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closed_consistency_check" CHECK (
  ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedByUserId" IS NOT NULL AND "closingTheoreticalBalance" IS NOT NULL)
  OR
  ("status" = 'OPEN' AND "closedAt" IS NULL AND "closedByUserId" IS NULL AND "closingTheoreticalBalance" IS NULL)
);

-- CashSession : un écart n'a de sens que si un comptage physique a été
-- fourni.
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_variance_requires_count_check" CHECK (
  "variance" IS NULL OR "physicalCount" IS NOT NULL
);

-- CashSession : motif obligatoire dès que l'écart est non nul (Bloc 17.1
-- décision E / Bloc 17.2 section 3.1) — la clôture elle-même n'est jamais
-- bloquée, seul le motif est exigé lorsqu'il y a réellement un écart.
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_variance_reason_required_check" CHECK (
  "variance" IS NULL OR "variance" = 0 OR "varianceReason" IS NOT NULL
);

-- CashSession : motif obligatoire pour toute ouverture manuelle
-- exceptionnelle (Bloc 17.1 décision I / Bloc 17.2 section 3.3).
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_opening_reason_required_check" CHECK (
  "openingIsManual" = false OR "openingReason" IS NOT NULL
);

-- CashSession : un solde d'ouverture ne peut pas être négatif.
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_opening_balance_non_negative_check" CHECK (
  "openingBalance" >= 0
);

-- CashCorrection : un ajustement de montant zéro n'a aucun sens métier.
ALTER TABLE "CashCorrection" ADD CONSTRAINT "CashCorrection_amount_nonzero_check" CHECK (
  "amount" <> 0
);

-- BankTransfer : cohérence EFFECTED <-> (effectedAt, effectedByUserId,
-- cashSessionId) — ces 3 champs ne sont renseignés QUE pour un virement
-- réellement EFFECTED (Bloc 17.2 section 8/22), jamais pour DRAFT/
-- SCHEDULED/CANCELLED.
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_effected_consistency_check" CHECK (
  ("status" = 'EFFECTED' AND "effectedAt" IS NOT NULL AND "effectedByUserId" IS NOT NULL AND "cashSessionId" IS NOT NULL)
  OR
  ("status" <> 'EFFECTED' AND "effectedAt" IS NULL AND "effectedByUserId" IS NULL AND "cashSessionId" IS NULL)
);

-- BankTransfer : montant toujours strictement positif.
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_amount_positive_check" CHECK (
  "amount" > 0
);

-- TransferSchedule : FIXED et PERCENTAGE sont mutuellement exclusifs,
-- jamais les deux en même temps, jamais aucun des deux (Bloc 17.2 section
-- 9) ; pourcentage borné à ]0, 100].
ALTER TABLE "TransferSchedule" ADD CONSTRAINT "TransferSchedule_amount_type_check" CHECK (
  ("amountType" = 'FIXED' AND "fixedAmount" IS NOT NULL AND "fixedAmount" > 0 AND "percentage" IS NULL)
  OR
  ("amountType" = 'PERCENTAGE' AND "percentage" IS NOT NULL AND "percentage" > 0 AND "percentage" <= 100 AND "fixedAmount" IS NULL)
);
