import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isPlatformAdmin: true,
      establishment: { select: { id: true, name: true, status: true } },
    },
  });
  console.log("=== USERS ===", JSON.stringify(users, null, 2));

  const ests = await prisma.establishment.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { properties: true, rentals: true, clients: true, users: true } },
    },
  });
  console.log("=== ESTABLISHMENTS ===", JSON.stringify(ests, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
