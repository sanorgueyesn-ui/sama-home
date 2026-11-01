-- Socle multi-espaces, lot A — mode métier, appartenances et espace actif de session.
--
-- Migration STRICTEMENT ADDITIVE : crée un type, une table et deux colonnes nullables ou à
-- valeur par défaut. Aucune colonne existante n'est modifiée ni supprimée ("User"."role" et
-- "User"."establishmentId" restent la source de vérité jusqu'au lot B) et aucune ligne existante
-- n'est modifiée, sauf l'ajout de la valeur par défaut RESIDENCE sur "Establishment"."businessMode".
--
-- Rétro-remplissage : une appartenance par compte rattaché à un établissement, avec son rôle
-- actuel. Rejouable sans doublon (ON CONFLICT sur la clé unique). Un compte de plateforme
-- (sans établissement) ou sans rôle n'en reçoit pas : "role" est obligatoire sur "Membership"
-- et aucun rôle n'est inventé.
--
-- Retour arrière (tant que l'application ne lit pas ces colonnes, c'est-à-dire avant le lot B) :
--   ALTER TABLE "Session" DROP COLUMN "activeEstablishmentId";
--   DROP TABLE "Membership";
--   ALTER TABLE "Establishment" DROP COLUMN "businessMode";
--   DROP TYPE "BusinessMode";

-- CreateEnum
CREATE TYPE "BusinessMode" AS ENUM ('HOTEL', 'RESIDENCE', 'REAL_ESTATE');

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN "businessMode" "BusinessMode" NOT NULL DEFAULT 'RESIDENCE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "activeEstablishmentId" TEXT;

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_establishmentId_key" ON "Membership"("userId", "establishmentId");

-- CreateIndex
CREATE INDEX "Membership_establishmentId_idx" ON "Membership"("establishmentId");

-- CreateIndex
CREATE INDEX "Session_activeEstablishmentId_idx" ON "Session"("activeEstablishmentId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeEstablishmentId_fkey" FOREIGN KEY ("activeEstablishmentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (rejouable)
INSERT INTO "Membership" ("id", "userId", "establishmentId", "role")
SELECT gen_random_uuid()::text, u."id", u."establishmentId", u."role"
FROM "User" u
WHERE u."establishmentId" IS NOT NULL
  AND u."role" IS NOT NULL
ON CONFLICT ("userId", "establishmentId") DO NOTHING;
