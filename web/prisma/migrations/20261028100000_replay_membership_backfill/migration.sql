-- Socle multi-espaces, lot B — rattrapage des appartements.
--
-- Le lot A a recopié, une seule fois, les comptes existants dans "Membership". Entre cette
-- migration et le déploiement du lot B (qui lit "Membership" pour décider de l'accès), un compte
-- a pu être créé sans appartenance : il n'aurait alors aucun espace. Cette migration rejoue le
-- même INSERT, rejouable sans doublon (clé unique + ON CONFLICT). Elle ne modifie ni ne
-- supprime aucune ligne existante et n'invente aucun rôle : un compte de plateforme (sans
-- établissement) ou sans rôle n'obtient aucune appartenance.
--
-- Retour arrière : aucun nécessaire (données seulement). Pour annuler, supprimer les lignes de
-- "Membership" ajoutées depuis la date de cette migration.

INSERT INTO "Membership" ("id", "userId", "establishmentId", "role")
SELECT gen_random_uuid()::text, u."id", u."establishmentId", u."role"
FROM "User" u
WHERE u."establishmentId" IS NOT NULL
  AND u."role" IS NOT NULL
ON CONFLICT ("userId", "establishmentId") DO NOTHING;
