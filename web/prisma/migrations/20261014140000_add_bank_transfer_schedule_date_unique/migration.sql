-- Phase 3G / Lot D12-P36 — contrainte anti-doublon pour les virements
-- programmés générés par catchUpSchedule() (voir D12-P32 à D12-P35).
-- NULL "transferScheduleId"/"scheduledAt" (virements créés manuellement via
-- createBankTransfer) ne collisionnent jamais entre eux ni avec cette
-- contrainte (sémantique SQL standard : NULL distinct de tout NULL).
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_schedule_date_unique" UNIQUE ("transferScheduleId", "scheduledAt");
