-- Phase 3G / Lot D12-P88 — additive, non destructive.
-- 1) Nouvelle table singleton `PlatformSettings`, même technique que
--    `PricingSettings` (migration 20261012000000) : id fixe 'singleton',
--    verrouillé par une contrainte CHECK réelle en base.
-- 2) `AuditLog.userId` rendu nullable (DROP NOT NULL uniquement — aucune
--    ligne existante modifiée ni supprimée, la contrainte de clé étrangère
--    reste inchangée).

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "autoApproveEstablishments" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- AddCheckConstraint (même convention que PricingSettings_singleton_check)
ALTER TABLE "PlatformSettings" ADD CONSTRAINT "PlatformSettings_singleton_check" CHECK ("id" = 'singleton');

-- AlterTable: AuditLog.userId devient nullable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
