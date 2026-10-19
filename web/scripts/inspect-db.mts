import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    include: {
      establishment: { select: { id: true, name: true, status: true } },
    },
  });
  console.log("=== USERS ===");
  for (const u of users) {
    const rentals = await prisma.rental.count({ where: { registeredByUserId: u.id } });
    const cashSessions = await prisma.cashSession.count({ where: { OR: [{ openedByUserId: u.id }, { closedByUserId: u.id }] } });
    const cashCorr = await prisma.cashCorrection.count({ where: { userId: u.id } });
    const bankT = await prisma.bankTransfer.count({ where: { OR: [{ createdByUserId: u.id }, { effectedByUserId: u.id }] } });
    console.log({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      establishment: u.establishment?.name,
      status: u.establishment?.status,
      isPlatformAdmin: u.isPlatformAdmin,
      refs: { rentals, cashSessions, cashCorr, bankT },
    });
  }

  const tokens = await prisma.passwordResetToken.findMany();
  console.log("=== PASSWORD RESET TOKENS ===");
  console.log(tokens);

  const otps = await prisma.otpVerification.findMany();
  console.log("=== OTP VERIFICATIONS ===");
  console.log(otps.map(o => ({ email: o.email, name: o.managerName, est: o.establishmentName })));

  const e1 = await prisma.establishment.findUnique({ where: { id: "cmvdq0um600000pmxwkfow49y" }, include: { users: true, properties: true, rentals: true } });
  const e2 = await prisma.establishment.findUnique({ where: { id: "cmved6xow00010ppd4ngsug6h" }, include: { users: true, properties: true, rentals: true } });
  console.log("=== E1 (Fatou: tawfekhsenegal221@gmail.com) ===", {
    id: e1?.id,
    name: e1?.name,
    users: e1?.users.map(u => ({ username: u.username, email: u.email })),
    properties: e1?.properties.length,
    rentals: e1?.rentals.length,
  });
  const resetLogs = await prisma.auditLog.findMany({
    where: { action: "USER_PASSWORD_RESET_SELF" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { username: true, email: true, name: true } } },
  });
  console.log("=== RESET LOGS ===", resetLogs.map(l => ({ user: l.user?.username, reason: l.reason, date: l.createdAt })));

  await prisma.$disconnect();
}

main().catch(console.error);
