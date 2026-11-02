-- Présentation choisie pour les documents PDF (contrats, quittances, tickets). Migration ADDITIVE :
-- trois colonnes avec valeur par défaut ; les établissements existants prennent la présentation 1.
ALTER TABLE "Settings"
  ADD COLUMN "documentContractTheme" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "documentTicketTheme" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "documentTicketPaper" TEXT NOT NULL DEFAULT '80';
