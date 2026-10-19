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
      email: true,
      username: true,
      name: true,
      role: true,
      isPlatformAdmin: true,
      establishmentId: true,
      establishment: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  console.log("=== ALL USERS IN DATABASE ===");
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
      isPlatformAdmin: u.isPlatformAdmin,
      establishment: u.establishment ? `${u.establishment.name} (${u.establishment.status})` : "None (Platform Admin)",
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
