import "dotenv/config";

const EXPECTED_DB = "samahome_test_playwright_p114";
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.port !== "2026" || url.pathname.replace(/^\//, "") !== EXPECTED_DB) {
  throw new Error(`Cible inattendue (${url.hostname}:${url.port}/${url.pathname}) — attendu ${EXPECTED_DB} — ABANDON.`);
}
console.log(`Cible confirmée : ${EXPECTED_DB} — écriture autorisée pour ce lot uniquement.\n`);

const { prisma } = await import("@/lib/prisma");
const { hashPassword } = await import("@/lib/password");

// Mot de passe de test, partagé par tous les comptes ci-dessous — jamais
// affiché dans le rapport, utilisé uniquement dans cette base isolée.
const TEST_PASSWORD = "PlaywrightTest!2026";
const passwordHash = await hashPassword(TEST_PASSWORD);

const results: Record<string, unknown> = {};

// 1. Établissement ACTIVE, abonnement valide.
const estActive = await prisma.establishment.create({ data: { name: "P118 Hotel Actif", status: "ACTIVE" } });
await prisma.subscription.create({
  data: { establishmentId: estActive.id, trialStartedAt: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
});
const userActive = await prisma.user.create({
  data: { username: "p118-admin-actif", passwordHash, name: "P118 Admin Actif", role: "ADMIN", establishmentId: estActive.id },
});
const propertyActive = await prisma.property.create({
  data: { name: "P118 Chambre Active", type: "ROOM", capacity: 2, active: true, establishmentId: estActive.id },
});
results.estActive = { id: estActive.id, name: estActive.name };
results.userActive = { id: userActive.id, username: userActive.username };
results.propertyActive = { id: propertyActive.id, name: propertyActive.name };

// 2. Établissement SUSPENDED, abonnement valide.
const estSuspended = await prisma.establishment.create({ data: { name: "P118 Hotel Suspendu", status: "SUSPENDED" } });
await prisma.subscription.create({
  data: { establishmentId: estSuspended.id, trialStartedAt: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
});
const userSuspended = await prisma.user.create({
  data: { username: "p118-admin-suspendu", passwordHash, name: "P118 Admin Suspendu", role: "ADMIN", establishmentId: estSuspended.id },
});
results.estSuspended = { id: estSuspended.id, name: estSuspended.name };
results.userSuspended = { id: userSuspended.id, username: userSuspended.username };

// 3. Établissement PENDING, aucun abonnement.
const estPending = await prisma.establishment.create({ data: { name: "P118 Hotel En Attente", status: "PENDING" } });
const userPending = await prisma.user.create({
  data: { username: "p118-admin-attente", passwordHash, name: "P118 Admin Attente", role: "ADMIN", establishmentId: estPending.id },
});
results.estPending = { id: estPending.id, name: estPending.name };
results.userPending = { id: userPending.id, username: userPending.username };

// 4. Établissement ACTIVE, abonnement expiré.
const estExpired = await prisma.establishment.create({ data: { name: "P118 Hotel Expire", status: "ACTIVE" } });
await prisma.subscription.create({
  data: { establishmentId: estExpired.id, trialStartedAt: new Date(Date.now() - 90 * 86400000), currentPeriodEnd: new Date(Date.now() - 86400000) },
});
const userExpired = await prisma.user.create({
  data: { username: "p118-admin-expire", passwordHash, name: "P118 Admin Expire", role: "ADMIN", establishmentId: estExpired.id },
});
results.estExpired = { id: estExpired.id, name: estExpired.name };
results.userExpired = { id: userExpired.id, username: userExpired.username };

// 5. Second établissement ACTIVE distinct — pour le test d'isolation inter-établissements.
const estActive2 = await prisma.establishment.create({ data: { name: "P118 Hotel Actif 2", status: "ACTIVE" } });
await prisma.subscription.create({
  data: { establishmentId: estActive2.id, trialStartedAt: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
});
const userActive2 = await prisma.user.create({
  data: { username: "p118-admin-actif2", passwordHash, name: "P118 Admin Actif 2", role: "ADMIN", establishmentId: estActive2.id },
});
results.estActive2 = { id: estActive2.id, name: estActive2.name };
results.userActive2 = { id: userActive2.id, username: userActive2.username };

// 6. Compte administrateur de plateforme — distinct, sans établissement.
const platformAdmin = await prisma.user.create({
  data: { username: "p118-platform-admin", passwordHash, name: "P118 Platform Admin", isPlatformAdmin: true, role: null, establishmentId: null },
});
results.platformAdmin = { id: platformAdmin.id, username: platformAdmin.username };

console.log("=== Données créées (identifiants réels, mots de passe jamais affichés) ===");
console.log(JSON.stringify(results, null, 2));

console.log("\n=== Comptages réels dans samahome_test_playwright_p114 après préparation ===");
for (const t of ["user", "establishment", "subscription", "property"] as const) {
  console.log(` ${t}: ${await (prisma[t] as { count: () => Promise<number> }).count()}`);
}

await prisma.$disconnect();
