// Standalone script run via `tsx` (see prisma7.config.ts, migrations.seed),
// outside the Next.js build. It deliberately does NOT import from src/lib/*:
// those files start with `import "server-only"`, a guard that Next's
// bundler resolves to a no-op on the server and to a hard error everywhere
// else — including a plain Node/tsx script like this one.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME;

  if (!username || !password || !name) {
    throw new Error(
      "SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD et SEED_ADMIN_NAME doivent être définis dans .env avant de lancer le seed (voir .env.example). Rien n'a été créé.",
    );
  }

  // Phase 17 audit (Bloc 6): this used to be an upsert whose `update`
  // clause silently overwrote an existing admin's name/password on every
  // re-run — a real risk in production if the seed command is ever
  // accidentally re-triggered (e.g. a misconfigured deploy pipeline). The
  // seed now only ever CREATES the first admin; an existing account with
  // this username is left completely untouched.
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(
      `Un compte existe déjà pour l'identifiant « ${username} » — le seed ne modifie jamais un compte existant. Rien n'a été changé.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, passwordHash, name, role: "ADMIN" },
  });

  console.log(`Compte créé : ${user.username} (${user.role}).`);
}

// D12-P135 — DÉSACTIVÉ : sur une base neuve, ces 10 catégories (insérées en
// SQL brut par la migration 20261001233836_add_expense_category_table, à une
// époque antérieure à `ExpenseCategory.establishmentId`) ne sont JAMAIS
// rattachées à un établissement par aucune migration ultérieure (vérifié
// exhaustivement sur les 21 migrations) — ce seed les retrouvait par leur
// seul `name` (sans filtre `establishmentId`) et ne faisait donc jamais que
// les laisser orphelines pour toujours, invisibles de tout établissement
// réel (voir src/lib/expense-categories-data.ts, qui filtre toujours sur un
// `establishmentId` réel, jamais `null`). Chaque nouvel établissement reçoit
// désormais ses propres catégories de départ au moment de son activation
// (voir createTrialSubscriptionAndAudit(), src/lib/establishment-activation.ts)
// — jamais une catégorie globale, jamais un rattachement rétroactif.
// Fonction conservée (jamais appelée) pour ne perdre aucune trace du code
// historique.
const EXPENSE_CATEGORIES = [
  { name: "Loyer", position: 0 },
  { name: "Électricité", position: 1 },
  { name: "Eau", position: 2 },
  { name: "Internet", position: 3 },
  { name: "Nettoyage", position: 4 },
  { name: "Entretien", position: 5 },
  { name: "Réparation", position: 6 },
  { name: "Salaire", position: 7 },
  { name: "Achat", position: 8 },
  { name: "Autre", position: 9 },
] as const;

async function seedExpenseCategories() {
  for (const category of EXPENSE_CATEGORIES) {
    // Même principe que seedAdmin() ci-dessus : ne jamais écraser une
    // catégorie déjà présente (un renommage ou une désactivation faite par
    // l'ADMIN ne doit jamais être annulé par un re-run du seed).
    const existing = await prisma.expenseCategory.findFirst({ where: { name: category.name } });
    if (existing) {
      console.log(`Catégorie de dépense déjà présente : « ${category.name} » — inchangée.`);
      continue;
    }
    await prisma.expenseCategory.create({
      data: { name: category.name, position: category.position, active: true },
    });
    console.log(`Catégorie de dépense créée : « ${category.name} ».`);
  }
}

async function main() {
  await seedAdmin();
  // D12-P135 — seedExpenseCategories() n'est plus appelée (voir le
  // commentaire de EXPENSE_CATEGORIES ci-dessus) : chaque établissement
  // reçoit désormais ses propres catégories à son activation.
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
