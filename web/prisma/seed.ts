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

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME;

  if (!username || !password || !name) {
    throw new Error(
      "SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD et SEED_ADMIN_NAME doivent être définis dans .env avant de lancer le seed (voir .env.example). Rien n'a été créé.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, name },
    create: { username, passwordHash, name, role: "ADMIN" },
  });

  console.log(`Compte prêt : ${user.username} (${user.role}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
