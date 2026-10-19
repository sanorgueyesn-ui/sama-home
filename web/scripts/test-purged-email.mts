import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function check(identifier: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, username: true, name: true },
  });

  const tokens = await prisma.passwordResetToken.findMany({
    where: { email: { equals: identifier, mode: "insensitive" } },
  });

  const otps = await prisma.otpVerification.findMany({
    where: { email: { equals: identifier, mode: "insensitive" } },
  });

  console.log(`Identifier: "${identifier}" => User found:`, user ? `${user.name} (${user.id})` : "NONE (DOES NOT EXIST)", `Tokens: ${tokens.length}, OTPs: ${otps.length}`);
}

async function main() {
  await check("gsanor5@gmail.com");
  await check("ibrot55@gmail.com");
  await check("tawfekhsenegal221@gmail.com");
  await check("sanorgueye221@gmail.com");
  await check("admin");
  await check("sanorgueye00@gmail.com");
  await prisma.$disconnect();
}

main().catch(console.error);
