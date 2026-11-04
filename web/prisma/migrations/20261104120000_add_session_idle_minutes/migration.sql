-- Déconnexion automatique réglable par l'établissement (minutes d'inactivité).
-- Migration additive : colonne avec valeur par défaut (30 = comportement actuel), aucune donnée réécrite.
ALTER TABLE "Settings" ADD COLUMN "sessionIdleMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Settings" ADD CONSTRAINT "Settings_sessionIdleMinutes_check" CHECK ("sessionIdleMinutes" BETWEEN 5 AND 720);
