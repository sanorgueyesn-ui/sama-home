-- AlterTable
-- Lot "Virements mensuels — ancre durable". Additive uniquement : aucune
-- colonne, table ni ligne supprimée ; aucune valeur existante de
-- "nextRunAt" (TransferSchedule) ni de "scheduledAt" (BankTransfer) n'est
-- modifiée par cette migration.
ALTER TABLE "TransferSchedule" ADD COLUMN "anchorDay" INTEGER;

-- TransferSchedule : si renseigné, le jour d'ancrage doit être un jour du
-- mois valide (1-31) — même style que TransferSchedule_amount_type_check.
ALTER TABLE "TransferSchedule" ADD CONSTRAINT "TransferSchedule_anchor_day_range_check" CHECK (
  "anchorDay" IS NULL OR ("anchorDay" >= 1 AND "anchorDay" <= 31)
);

-- Rattrapage des programmations déjà existantes : adopte le jour actuel de
-- "nextRunAt" comme nouveau point de référence. Ce n'est PAS une
-- reconstitution d'un jour d'origine déjà perdu par une dérive passée (ce
-- qui est impossible rétroactivement — l'information n'existe plus) : c'est
-- uniquement le point de départ qui empêche toute dérive FUTURE à partir de
-- maintenant. "nextRunAt" lui-même reste strictement inchangé.
UPDATE "TransferSchedule" SET "anchorDay" = EXTRACT(DAY FROM "nextRunAt") WHERE "anchorDay" IS NULL;
