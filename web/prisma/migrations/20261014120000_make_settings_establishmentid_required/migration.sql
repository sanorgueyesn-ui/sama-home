-- Phase 3F / Lot D12-C — `Settings.establishmentId` devient obligatoire.
-- Précontrôle exécuté avant cette migration (lecture seule, base locale
-- samahome_dev) : 1 ligne `Settings` au total, 0 ligne avec
-- "establishmentId" NULL, 0 ligne orpheline (ne référençant aucun
-- `Establishment` existant). La contrainte d'unicité
-- (`Settings_establishmentId_key`) et la clé étrangère
-- (`Settings_establishmentId_fkey`) existent déjà depuis la migration
-- 20261012000000_add_multi_tenant_notifications_subscriptions — non
-- recréées ici.
ALTER TABLE "Settings" ALTER COLUMN "establishmentId" SET NOT NULL;
