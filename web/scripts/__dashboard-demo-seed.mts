/**
 * Données de démonstration pour regarder les tableaux de bord (base de test locale UNIQUEMENT).
 * Remplit l'espace d'un compte donné : logements, séjours en cours, réservations, paiements et
 * dépenses réalistes. Refuse toute base dont le nom ne commence pas par `samahome_test_` ou dont
 * l'hôte n'est pas local, et ne fait rien si les logements « Démo » existent déjà.
 *
 * Usage : DATABASE_URL=<base de test locale> npx tsx scripts/__dashboard-demo-seed.mts <nom-d-utilisateur>
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL doit être passée explicitement.");
const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !dbName.startsWith("samahome_test_")) {
  throw new Error("REFUSÉ : base locale samahome_test_* uniquement.");
}
const username = process.argv[2];
if (!username) throw new Error("Nom d'utilisateur requis.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const user = await prisma.user.findUnique({
  where: { username },
  select: { id: true, memberships: { select: { establishmentId: true }, take: 1 } },
});
const establishmentId = user?.memberships[0]?.establishmentId;
if (!user || !establishmentId) throw new Error("Compte introuvable ou sans espace.");

const already = await prisma.property.count({ where: { establishmentId, name: { startsWith: "Démo" } } });
if (already > 0) {
  console.log("Données de démonstration déjà présentes : rien à faire.");
  await prisma.$disconnect();
  process.exit(0);
}

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const hoursAhead = (h: number) => new Date(now.getTime() + h * 3_600_000);
const todayAt = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
};
const daysAgoAt = (days: number, h: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(h, 0, 0, 0);
  return d;
};

const rooms = ["101", "102", "103", "104", "105", "106"];
const apartments = ["A1", "A2", "A3", "A4"];

const properties: { id: string; name: string; type: "ROOM" | "APARTMENT" }[] = [];
for (const [index, code] of rooms.entries()) {
  const property = await prisma.property.create({
    data: { name: `Démo Chambre ${code}`, type: "ROOM", capacity: 2, active: index !== 5, establishmentId },
    select: { id: true, name: true, type: true },
  });
  properties.push(property);
}
for (const code of apartments) {
  const property = await prisma.property.create({
    data: { name: `Démo Appartement ${code}`, type: "APARTMENT", capacity: 4, establishmentId },
    select: { id: true, name: true, type: true },
  });
  properties.push(property);
}

const tariffs = new Map<string, string>();
for (const property of properties) {
  const tariff = await prisma.tariff.create({
    data: {
      propertyId: property.id,
      label: "Nuitée",
      type: "NUIT",
      durationValue: 1,
      durationUnit: "NIGHT",
      amount: property.type === "ROOM" ? 18_000 : 45_000,
      establishmentId,
    },
    select: { id: true },
  });
  tariffs.set(property.id, tariff.id);
}

const clientNames = [
  ["Awa Diop", "771110001"],
  ["Mamadou Ndiaye", "772220002"],
  ["Fatou Sow", "773330003"],
  ["Ibrahima Fall", "774440004"],
  ["Khady Gueye", "775550005"],
  ["Cheikh Ba", "776660006"],
  ["Aminata Sarr", "777770007"],
];
const clients: string[] = [];
for (const [name, phone] of clientNames) {
  const client = await prisma.client.create({ data: { name, phone, establishmentId }, select: { id: true } });
  clients.push(client.id);
}

const byName = (suffix: string) => {
  const found = properties.find((p) => p.name.endsWith(suffix));
  if (!found) throw new Error(`Logement ${suffix} introuvable`);
  return found;
};

// Séjours en cours : [logement, client, arrivée, départ prévu, montant, déjà payé]
const stays: [string, number, Date, Date, number, number][] = [
  ["Chambre 101", 0, hoursAgo(3), todayAt(18), 18_000, 18_000],
  ["Chambre 102", 1, daysAgoAt(1, 14), hoursAhead(20), 36_000, 20_000],
  ["Chambre 103", 2, daysAgoAt(2, 11), todayAt(23, 30), 54_000, 54_000],
  ["Chambre 104", 3, hoursAgo(26), hoursAhead(46), 72_000, 30_000],
  ["Appartement A1", 4, daysAgoAt(3, 16), hoursAhead(70), 225_000, 150_000],
  ["Appartement A2", 5, hoursAgo(9), hoursAhead(63), 135_000, 0],
];
for (const [suffix, clientIndex, arrivalAt, plannedDepartureAt, amount, paid] of stays) {
  const property = byName(suffix);
  const rental = await prisma.rental.create({
    data: {
      clientId: clients[clientIndex],
      propertyId: property.id,
      tariffId: tariffs.get(property.id),
      establishmentId,
      arrivalAt,
      plannedDepartureAt,
      durationValue: Math.max(1, Math.round((plannedDepartureAt.getTime() - arrivalAt.getTime()) / 86_400_000)),
      durationUnit: "NIGHT",
      amount,
      status: "ACTIVE",
      registeredByUserId: user.id,
    },
    select: { id: true },
  });
  if (paid > 0) {
    await prisma.payment.create({
      data: { rentalId: rental.id, establishmentId, amount: paid, method: "WAVE", paidAt: arrivalAt > daysAgoAt(0, 0) ? arrivalAt : hoursAgo(5) },
    });
  }
}

// Réservations : une arrivée attendue aujourd'hui, deux à venir.
const reservations: [string, number, Date, Date, number][] = [
  ["Chambre 105", 6, hoursAhead(3), hoursAhead(27), 18_000],
  ["Appartement A3", 0, daysAgoAt(-2, 15), daysAgoAt(-5, 11), 135_000],
  ["Appartement A4", 1, daysAgoAt(-4, 14), daysAgoAt(-6, 11), 90_000],
];
for (const [suffix, clientIndex, arrivalTime, departureTime, amount] of reservations) {
  const property = byName(suffix);
  await prisma.reservation.create({
    data: {
      clientId: clients[clientIndex],
      propertyId: property.id,
      tariffId: tariffs.get(property.id)!,
      establishmentId,
      date: arrivalTime,
      arrivalTime,
      departureTime,
      durationValue: 1,
      durationUnit: "NIGHT",
      amount,
      status: "CONFIRMED",
    },
  });
}

// Historique d'encaissements sur 7 jours + mois précédent, via des séjours terminés.
const history: [number, number, "CASH" | "WAVE" | "ORANGE_MONEY"][] = [
  [1, 45_000, "WAVE"],
  [2, 36_000, "CASH"],
  [3, 90_000, "ORANGE_MONEY"],
  [4, 18_000, "CASH"],
  [5, 54_000, "WAVE"],
  [6, 72_000, "ORANGE_MONEY"],
  [20, 135_000, "WAVE"],
  [35, 90_000, "CASH"],
];
for (const [days, amount, method] of history) {
  const property = byName("Chambre 106");
  const rental = await prisma.rental.create({
    data: {
      clientId: clients[days % clients.length],
      propertyId: property.id,
      tariffId: tariffs.get(property.id),
      establishmentId,
      arrivalAt: daysAgoAt(days + 1, 12),
      plannedDepartureAt: daysAgoAt(days, 11),
      actualDepartureAt: daysAgoAt(days, 11),
      durationValue: 1,
      durationUnit: "NIGHT",
      amount,
      status: "COMPLETED",
      registeredByUserId: user.id,
    },
    select: { id: true },
  });
  await prisma.payment.create({ data: { rentalId: rental.id, establishmentId, amount, method, paidAt: daysAgoAt(days, 10) } });
}

// Une recette en espèces aujourd'hui (en plus des acomptes ci-dessus) et des dépenses.
const category = await prisma.expenseCategory.create({ data: { name: "Démo Électricité", establishmentId }, select: { id: true } });
const category2 = await prisma.expenseCategory.create({ data: { name: "Démo Entretien", establishmentId }, select: { id: true } });
for (const [categoryId, name, amount, daysBack] of [
  [category.id, "Démo Électricité", 25_000, 0],
  [category2.id, "Démo Entretien", 12_000, 2],
  [category.id, "Démo Électricité", 40_000, 9],
] as const) {
  await prisma.expense.create({
    data: { categoryId, categoryNameSnapshot: name, establishmentId, amount, method: "CASH", paidAt: daysAgoAt(daysBack, 9) },
  });
}

console.log("Données de démonstration créées : 10 logements, 6 séjours en cours, 3 réservations, paiements et dépenses.");
await prisma.$disconnect();
