import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function deleteEstablishmentFull(establishmentId: string, name: string) {
  console.log(`\n--- DELETING ESTABLISHMENT: ${name} (${establishmentId}) ---`);

  // 1. Purge all tokens for users of this establishment
  const estUsers = await prisma.user.findMany({
    where: { establishmentId },
    select: { id: true, email: true, username: true },
  });

  const emails = Array.from(
    new Set(
      estUsers
        .flatMap((u) => [u.email?.toLowerCase(), u.username?.toLowerCase()])
        .filter(Boolean) as string[]
    )
  );

  for (const email of emails) {
    const deletedTokens = await prisma.passwordResetToken.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    const deletedOtps = await prisma.otpVerification.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    console.log(`Purged tokens for ${email}: ${deletedTokens.count} reset tokens, ${deletedOtps.count} OTPs`);
  }

  // 2. Child tables
  await prisma.notificationRead.deleteMany({ where: { notification: { relatedEstablishmentId: establishmentId } } });
  await prisma.notification.deleteMany({ where: { relatedEstablishmentId: establishmentId } });
  await prisma.cashCorrection.deleteMany({ where: { establishmentId } });
  await prisma.cashSession.deleteMany({ where: { establishmentId } });
  await prisma.cashRegister.deleteMany({ where: { establishmentId } });
  await prisma.bankTransfer.deleteMany({ where: { establishmentId } });
  await prisma.transferSchedule.deleteMany({ where: { establishmentId } });
  await prisma.bankAccount.deleteMany({ where: { establishmentId } });
  await prisma.expense.deleteMany({ where: { establishmentId } });
  await prisma.expenseCategory.deleteMany({ where: { establishmentId } });
  await prisma.payment.deleteMany({ where: { establishmentId } });
  await prisma.rentalExtension.deleteMany({ where: { establishmentId } });
  await prisma.rental.deleteMany({ where: { establishmentId } });
  await prisma.reservation.deleteMany({ where: { establishmentId } });
  await prisma.tariff.deleteMany({ where: { establishmentId } });
  await prisma.property.deleteMany({ where: { establishmentId } });
  await prisma.client.deleteMany({ where: { establishmentId } });
  await prisma.subscriptionPayment.deleteMany({ where: { subscription: { establishmentId } } });
  await prisma.subscription.deleteMany({ where: { establishmentId } });
  await prisma.settings.deleteMany({ where: { establishmentId } });
  await prisma.session.deleteMany({ where: { user: { establishmentId } } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [{ establishmentId }, { user: { establishmentId } }],
    },
  });

  // 3. Delete users and establishment
  await prisma.user.deleteMany({ where: { establishmentId } });
  await prisma.establishment.delete({ where: { id: establishmentId } });
  console.log(`Successfully deleted establishment ${name} and all its users/data.`);
}

async function cleanPlatformTestData(estId: string) {
  console.log(`\n--- CLEANING TEST DATA FROM PLATFORM ESTABLISHMENT (${estId}) ---`);
  await prisma.payment.deleteMany({ where: { establishmentId: estId } });
  await prisma.rentalExtension.deleteMany({ where: { establishmentId: estId } });
  await prisma.rental.deleteMany({ where: { establishmentId: estId } });
  await prisma.reservation.deleteMany({ where: { establishmentId: estId } });
  await prisma.tariff.deleteMany({ where: { establishmentId: estId } });
  await prisma.property.deleteMany({ where: { establishmentId: estId } });
  await prisma.client.deleteMany({ where: { establishmentId: estId } });
  await prisma.cashCorrection.deleteMany({ where: { establishmentId: estId } });
  await prisma.cashSession.deleteMany({ where: { establishmentId: estId } });
  await prisma.bankTransfer.deleteMany({ where: { establishmentId: estId } });
  await prisma.expense.deleteMany({ where: { establishmentId: estId } });
  console.log(`Cleared test properties, rentals, clients, payments from platform establishment.`);
}

async function main() {
  console.log("=== STARTING FULL DATABASE CLEANUP FOR PRODUCTION ===");

  // 1. Delete all test establishments and test users
  const testEsts = await prisma.establishment.findMany({
    where: {
      name: { not: "SAMA  HOME  TEST" },
    },
  });

  for (const est of testEsts) {
    await deleteEstablishmentFull(est.id, est.name);
  }

  // 2. Clean test rentals/properties/clients from SAMA HOME TEST
  const samaTestEst = await prisma.establishment.findFirst({
    where: { name: "SAMA  HOME  TEST" },
  });
  if (samaTestEst) {
    await cleanPlatformTestData(samaTestEst.id);
  }

  // 3. Clear all orphaned tokens & OTPs
  await prisma.passwordResetToken.deleteMany({});
  await prisma.otpVerification.deleteMany({});
  console.log("Cleared all PasswordResetToken and OtpVerification tables.");

  // 4. Verify remaining database state
  console.log("\n=== FINAL DATABASE STATE ===");
  const remainingUsers = await prisma.user.findMany({
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
  console.log("REMAINING USERS:", JSON.stringify(remainingUsers, null, 2));

  const remainingEsts = await prisma.establishment.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { properties: true, rentals: true, clients: true, users: true } },
    },
  });
  console.log("REMAINING ESTABLISHMENTS:", JSON.stringify(remainingEsts, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
