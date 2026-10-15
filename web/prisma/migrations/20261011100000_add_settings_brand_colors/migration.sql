-- Lot "Personnalisation des couleurs" : palette de marque personnalisée au
-- niveau de l'établissement. NULL sur les trois colonnes = couleurs par
-- défaut SAMA HOME (#12304A / #E5484D / #F59E0B), résolues côté application.
ALTER TABLE "Settings" ADD COLUMN "primaryColor" TEXT;
ALTER TABLE "Settings" ADD COLUMN "secondaryColor" TEXT;
ALTER TABLE "Settings" ADD COLUMN "accentColor" TEXT;

-- Les trois couleurs sont toujours NULL ensemble ou renseignées ensemble :
-- l'interface propose des palettes complètes prédéfinies, jamais le
-- remplacement d'une seule couleur isolée de sa palette.
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_brand_colors_all_or_none_check" CHECK (
  ("primaryColor" IS NULL AND "secondaryColor" IS NULL AND "accentColor" IS NULL)
  OR ("primaryColor" IS NOT NULL AND "secondaryColor" IS NOT NULL AND "accentColor" IS NOT NULL)
);
