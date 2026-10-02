-- Bloc 16.1 — Catégories de dépenses configurables.
--
-- Migration hors du diff naïf généré automatiquement par Prisma (celui-ci
-- droppait directement la colonne "category" et le type enum, ce qui aurait
-- perdu toute donnée existante — voir l'avertissement d'origine de Prisma :
-- "Added the required column `categoryId`... without a default value. This
-- is not possible if the table is not empty."). Réécrite ici à la main pour
-- rester correcte même si des dépenses existent au moment de l'exécution
-- (la base de dev contient 0 ligne au moment où ce bloc est écrit, mais
-- cette migration ne doit pas en dépendre).
--
-- Contrainte technique notable : la table cible et l'ancien enum portent
-- EXACTEMENT le même nom Postgres ("ExpenseCategory"). Or CREATE TABLE crée
-- implicitement un type composite du même nom que la table — ce qui entre
-- en collision avec un enum préexistant portant ce nom. L'ancien enum est
-- donc renommé AVANT la création de la table (étape 0), le temps du
-- backfill, puis supprimé sous son nom temporaire à la toute fin (étape 12).
-- Exécutée comme une seule transaction (comportement par défaut de Prisma
-- Migrate) : tout échoue et rien n'est committé si une étape échoue.

-- 0. Libère le nom "ExpenseCategory" (occupé par l'ancien enum) sans toucher
--    aux valeurs existantes de la colonne "Expense"."category".
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old_enum";

-- 1. Nouvelle table de configuration.
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpenseCategory_active_position_idx" ON "ExpenseCategory"("active", "position");

-- 2. Colonnes temporairement nullables sur Expense, le temps du backfill.
ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "categoryNameSnapshot" TEXT;

-- 3. Les 10 catégories historiques (ids générés ici en SQL pur via
--    gen_random_uuid() — disponible nativement depuis PostgreSQL 16, voir
--    vérification faite avant cette migration ; @default(cuid()) de Prisma
--    est un générateur côté client, inutilisable dans une migration SQL).
INSERT INTO "ExpenseCategory" ("id", "name", "active", "position", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Loyer',       true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Électricité', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Eau',         true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Internet',    true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Nettoyage',   true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Entretien',   true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Réparation',  true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Salaire',     true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Achat',       true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Autre',       true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Backfill des dépenses existantes : correspondance obligatoire
--    enum -> catégorie, categoryId + categoryNameSnapshot renseignés
--    ensemble pour chaque ligne (aucune dépense perdue si la table n'est
--    pas vide au moment de l'exécution).
WITH mapping(enum_value, fr_name) AS (
  VALUES
    ('RENT',        'Loyer'),
    ('ELECTRICITY', 'Électricité'),
    ('WATER',       'Eau'),
    ('INTERNET',    'Internet'),
    ('CLEANING',    'Nettoyage'),
    ('MAINTENANCE', 'Entretien'),
    ('REPAIR',      'Réparation'),
    ('SALARY',      'Salaire'),
    ('PURCHASE',    'Achat'),
    ('OTHER',       'Autre')
)
UPDATE "Expense" e
SET "categoryId" = c."id",
    "categoryNameSnapshot" = c."name"
FROM "ExpenseCategory" c
JOIN mapping m ON m."fr_name" = c."name"
WHERE e."category"::text = m."enum_value";

-- 5. Garde-fou : la migration échoue bruyamment (et annule tout, transaction
--    unique) plutôt que de rendre categoryId obligatoire sur une ligne non
--    rattachée.
DO $$
DECLARE missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM "Expense" WHERE "categoryId" IS NULL;
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Migration abandonnée : % dépense(s) sans categoryId après backfill (correspondance enum -> catégorie incomplète).', missing_count;
  END IF;
END $$;

-- 6. categoryId/categoryNameSnapshot deviennent obligatoires.
ALTER TABLE "Expense" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "categoryNameSnapshot" SET NOT NULL;

-- 7. FK structurelle — onDelete Restrict (jamais de suppression physique
--    d'une catégorie référencée), cohérent avec le reste du schéma.
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Index : l'ancien index sur l'enum est remplacé par un index sur la FK.
DROP INDEX "Expense_category_idx";
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- 9. L'ancienne colonne enum n'est plus nécessaire une fois le backfill
--    vérifié (étape 5) et la FK en place (étape 7).
ALTER TABLE "Expense" DROP COLUMN "category";

-- 10. Dernière trace de l'ancien enum supprimée (renommé à l'étape 0).
DROP TYPE "ExpenseCategory_old_enum";
