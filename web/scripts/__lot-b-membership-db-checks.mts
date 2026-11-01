/**
 * Vérifications SQL réelles du lot B (socle multi-espaces) : les requêtes Prisma ajoutées
 * (lecture des appartenances, garde de suppression d'établissement, remplaçant ADMIN de la
 * purge) sont exécutées contre une VRAIE base, car les tests unitaires n'utilisent que des
 * doublures et ne prouvent pas le comportement SQL (notamment `NOT` avec des valeurs NULL).
 *
 * Usage : DATABASE_URL=<base de test locale> npx tsx scripts/__lot-b-membership-db-checks.mts
 *
 * Garde : refuse toute base dont le nom ne commence pas par `samahome_test_` ou dont l'hôte
 * n'est pas 127.0.0.1 / localhost. N'utilise PAS .env (donc jamais la production) : la cible
 * doit être passée explicitement. Toutes les lignes créées portent le préfixe `lotb-` et sont
 * supprimées à la fin.
 */
import assert from "node:assert/strict";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sharedAccountsWhere } from "../src/lib/membership-guards";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL doit être passée explicitement.");
const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !dbName.startsWith("samahome_test_")) {
  throw new Error(`REFUSÉ : cible non autorisée (${parsed.hostname}/${dbName}). Base locale samahome_test_* uniquement.`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const P = "lotb-";
let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`  ✔ ${name}`);
}

// Requête RÉELLE de la garde de suppression (src/lib/membership-guards.ts), pas une copie.
function sharedAccountsCount(establishmentId: string) {
  return prisma.membership.count({ where: sharedAccountsWhere(establishmentId) });
}

async function cleanup() {
  await prisma.session.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.membership.deleteMany({ where: { userId: { startsWith: P } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: P } } });
  await prisma.establishment.deleteMany({ where: { id: { startsWith: P } } });
}

try {
  await cleanup();
  const e1 = await prisma.establishment.create({ data: { id: `${P}e1`, name: "Lot B E1", status: "ACTIVE" } });
  const e2 = await prisma.establishment.create({ data: { id: `${P}e2`, name: "Lot B E2", status: "ACTIVE" } });
  const e3 = await prisma.establishment.create({ data: { id: `${P}e3`, name: "Lot B E3 (isolé)", status: "ACTIVE" } });
  const mk = (id: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { id: `${P}${id}`, username: `${P}${id}@test`, passwordHash: "x", name: id, ...extra } });

  const u1 = await mk("u1", { role: "ADMIN", establishmentId: e1.id });
  const u2 = await mk("u2", { role: "ADMIN", establishmentId: e1.id }); // multi-espaces
  const u4 = await mk("u4", { role: "ADMIN", establishmentId: e3.id }); // seul dans E3
  const u3 = await mk("u3", { isPlatformAdmin: true, role: "ADMIN" }); // plateforme, sans espace
  await prisma.membership.createMany({
    data: [
      { userId: u1.id, establishmentId: e1.id, role: "ADMIN" },
      { userId: u2.id, establishmentId: e1.id, role: "ADMIN" },
      { userId: u2.id, establishmentId: e2.id, role: "GESTIONNAIRE" },
      { userId: u4.id, establishmentId: e3.id, role: "ADMIN" },
    ],
  });
  console.log("Requêtes du lot B contre une base réelle :");

  // 1. Lecture des appartenances (forme exacte de loadCurrentUser dans dal.ts)
  const row = await prisma.user.findUnique({
    where: { id: u2.id },
    select: { id: true, role: true, memberships: { select: { establishmentId: true, role: true } } },
  });
  assert.equal(row?.memberships.length, 2);
  assert.deepEqual(row?.memberships.map((m) => `${m.establishmentId}:${m.role}`).sort(), [`${e1.id}:ADMIN`, `${e2.id}:GESTIONNAIRE`]);
  ok("un compte multi-espaces remonte ses deux appartenances avec leur rôle propre");

  // 1 bis. Gestion des comptes par appartenance (formes exactes de users-data.ts / users.ts)
  const shared = await prisma.membership.findUnique({
    where: { userId_establishmentId: { userId: u2.id, establishmentId: e1.id } },
    select: { role: true, user: { select: { _count: { select: { memberships: true } } } } },
  });
  assert.equal(shared?.user._count.memberships, 2);
  ok("un compte partagé est reconnu (2 espaces) depuis l'un de ses espaces");

  const outsider = await prisma.membership.findUnique({
    where: { userId_establishmentId: { userId: u1.id, establishmentId: e2.id } },
  });
  assert.equal(outsider, null);
  ok("un compte d'un autre espace est introuvable (jamais renvoyé)");

  const wrongSpace = await prisma.user.updateMany({
    where: { id: u1.id, memberships: { some: { establishmentId: e2.id } } },
    data: { name: "ne-doit-pas-changer" },
  });
  assert.equal(wrongSpace.count, 0);
  const rightSpace = await prisma.user.updateMany({
    where: { id: u1.id, memberships: { some: { establishmentId: e1.id } } },
    data: { name: "u1" },
  });
  assert.equal(rightSpace.count, 1);
  ok("une écriture sur un compte n'aboutit que depuis un espace dont il est membre");

  const otherAdmins = await prisma.membership.count({
    where: { establishmentId: e1.id, role: "ADMIN", userId: { not: u1.id } },
  });
  assert.equal(otherAdmins, 1); // u2 (u6 n'existe pas encore à ce stade)
  ok("« au moins un ADMIN » se compte sur les appartenances de l'espace");

  const plat = await prisma.user.findUnique({ where: { id: u3.id }, select: { memberships: { select: { role: true } } } });
  assert.equal(plat?.memberships.length, 0);
  ok("un compte de plateforme n'a aucune appartenance");

  // 2. Garde de suppression d'établissement
  assert.ok((await sharedAccountsCount(e1.id)) > 0);
  ok("supprimer E1 (compte u2 aussi dans E2) : REFUSÉ par la garde");
  assert.ok((await sharedAccountsCount(e2.id)) > 0);
  ok("supprimer E2 (appartenance de u2 dont la colonne historique pointe vers E1) : REFUSÉ par la garde");
  assert.equal(await sharedAccountsCount(e3.id), 0);
  ok("supprimer E3 (compte unique, rien de partagé) : autorisé, la garde compte 0");

  // Un compte sans colonne historique (NULL) mais membre de E3 doit aussi être détecté (piège SQL de NOT / NULL).
  const u5 = await mk("u5", { role: "GESTIONNAIRE" });
  await prisma.membership.create({ data: { userId: u5.id, establishmentId: e3.id, role: "GESTIONNAIRE" } });
  assert.ok((await sharedAccountsCount(e3.id)) > 0);
  ok("un membre dont la colonne historique est NULL est bien détecté (piège NOT / NULL évité)");
  await prisma.membership.deleteMany({ where: { userId: u5.id } });
  await prisma.user.delete({ where: { id: u5.id } });

  // 3. Remplaçant ADMIN de la purge (forme exacte de user-purge.ts).
  // u6 : colonne historique NULL, ADMIN de E1 UNIQUEMENT par appartenance. Seule la clause
  // `memberships` peut le trouver ; u2 (historique E1) et u3 (plateforme) sont exclus de la recherche.
  const u6 = await mk("u6");
  await prisma.membership.create({ data: { userId: u6.id, establishmentId: e1.id, role: "ADMIN" } });
  const substitute = await prisma.user.findFirst({
    where: {
      // `startsWith` : ne considère que les lignes de ce script (la base de test peut contenir d'autres comptes).
      id: { notIn: [u1.id, u2.id, u3.id], startsWith: P },
      OR: [
        { establishmentId: e1.id, role: "ADMIN" },
        { memberships: { some: { establishmentId: e1.id, role: "ADMIN" } } },
        { isPlatformAdmin: true },
      ],
    },
    select: { id: true },
  });
  assert.equal(substitute?.id, u6.id);
  ok("la purge trouve un remplaçant ADMIN par la seule clause d'appartenance (colonne historique NULL)");

  // 4. Contrainte d'unicité
  await assert.rejects(
    prisma.membership.create({ data: { userId: u1.id, establishmentId: e1.id, role: "ADMIN" } }),
    /Unique constraint|unique/i,
  );
  ok("une même appartenance ne peut pas être créée deux fois");

  // 5. Session : activeEstablishmentId passe à NULL quand l'espace est supprimé
  await prisma.session.create({
    data: { id: `${P}s1`, userId: u4.id, expiresAt: new Date(Date.now() + 3_600_000), activeEstablishmentId: e3.id },
  });
  await prisma.membership.deleteMany({ where: { establishmentId: e3.id } });
  await prisma.user.delete({ where: { id: u4.id } }); // cascade : supprime la session de u4
  await prisma.establishment.delete({ where: { id: e3.id } });
  assert.equal(await prisma.session.count({ where: { id: `${P}s1` } }), 0);
  assert.equal(await prisma.membership.count({ where: { establishmentId: e3.id } }), 0);
  ok("supprimer un compte puis son espace : sessions et appartenances disparues (cascade), aucun orphelin");

  const sess = await prisma.session.create({
    data: { id: `${P}s2`, userId: u1.id, expiresAt: new Date(Date.now() + 3_600_000), activeEstablishmentId: e2.id },
  });
  await prisma.membership.deleteMany({ where: { establishmentId: e2.id } });
  await prisma.user.updateMany({ where: { establishmentId: e2.id }, data: { establishmentId: null } });
  await prisma.establishment.delete({ where: { id: e2.id } });
  const after = await prisma.session.findUnique({ where: { id: sess.id }, select: { activeEstablishmentId: true } });
  assert.equal(after?.activeEstablishmentId, null);
  ok("supprimer un espace met l'espace actif des sessions à NULL (la session survit)");

  console.log(`\n${passed} vérifications réussies sur ${dbName}.`);
} finally {
  await cleanup();
  await prisma.$disconnect();
}
