import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function purgeEmailAndEstablishment(emailToPurge: string, establishmentName?: string) {
  console.log(`\n--- PURGING: ${emailToPurge} ---`);
  
  // 1. Delete all PasswordResetTokens
  const deletedTokens = await prisma.passwordResetToken.deleteMany({
    where: { email: { equals: emailToPurge, mode: "insensitive" } },
  });
  console.log(`Deleted ${deletedTokens.count} PasswordResetTokens for ${emailToPurge}`);

  // 2. Delete all OtpVerifications
  const deletedOtps = await prisma.otpVerification.deleteMany({
    where: { email: { equals: emailToPurge, mode: "insensitive" } },
  });
  console.log(`Deleted ${deletedOtps.count} OtpVerifications for ${emailToPurge}`);

  // 3. Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: emailToPurge, mode: "insensitive" } },
        { username: { equals: emailToPurge, mode: "insensitive" } },
      ],
    },
  });

  if (user) {
    console.log(`Found user: ${user.name} (${user.id})`);
    
    // Unlink any optional FKs
    await prisma.rental.updateMany({ where: { registeredByUserId: user.id }, data: { registeredByUserId: null } });
    await prisma.cashSession.updateMany({ where: { closedByUserId: user.id }, data: { closedByUserId: null } });
    await prisma.bankTransfer.updateMany({ where: { effectedByUserId: user.id }, data: { effectedByUserId: null } });
    await prisma.subscriptionPayment.updateMany({ where: { confirmedByUserId: user.id }, data: { confirmedByUserId: null } });
    
    // Delete sessions, notification reads, audit logs
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.notificationRead.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });

    // Delete user
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Successfully hard-deleted user ${user.id} (${emailToPurge})`);
  } else {
    console.log(`No User row found for ${emailToPurge}`);
  }

  // 4. If establishment name provided, check and delete completely
  if (establishmentName) {
    const est = await prisma.establishment.findFirst({
      where: { name: establishmentName },
    });
    if (est) {
      await prisma.notificationRead.deleteMany({ where: { notification: { relatedEstablishmentId: est.id } } });
      await prisma.notification.deleteMany({ where: { relatedEstablishmentId: est.id } });
      await prisma.cashCorrection.deleteMany({ where: { establishmentId: est.id } });
      await prisma.cashSession.deleteMany({ where: { establishmentId: est.id } });
      await prisma.cashRegister.deleteMany({ where: { establishmentId: est.id } });
      await prisma.bankTransfer.deleteMany({ where: { establishmentId: est.id } });
      await prisma.transferSchedule.deleteMany({ where: { establishmentId: est.id } });
      await prisma.bankAccount.deleteMany({ where: { establishmentId: est.id } });
      await prisma.expense.deleteMany({ where: { establishmentId: est.id } });
      await prisma.expenseCategory.deleteMany({ where: { establishmentId: est.id } });
      await prisma.payment.deleteMany({ where: { establishmentId: est.id } });
      await prisma.rentalExtension.deleteMany({ where: { establishmentId: est.id } });
      await prisma.rental.deleteMany({ where: { establishmentId: est.id } });
      await prisma.reservation.deleteMany({ where: { establishmentId: est.id } });
      await prisma.tariff.deleteMany({ where: { establishmentId: est.id } });
      await prisma.property.deleteMany({ where: { establishmentId: est.id } });
      await prisma.client.deleteMany({ where: { establishmentId: est.id } });
      await prisma.subscriptionPayment.deleteMany({ where: { subscription: { establishmentId: est.id } } });
      await prisma.subscription.deleteMany({ where: { establishmentId: est.id } });
      await prisma.settings.deleteMany({ where: { establishmentId: est.id } });
      await prisma.session.deleteMany({ where: { user: { establishmentId: est.id } } });
      await prisma.auditLog.deleteMany({ where: { OR: [{ establishmentId: est.id }, { user: { establishmentId: est.id } }] } });
      await prisma.user.deleteMany({ where: { establishmentId: est.id } });
      await prisma.establishment.delete({ where: { id: est.id } });
      console.log(`Deleted test establishment « ${establishmentName} » (${est.id})`);
    }
  }
}

async function main() {
  // Purge test account gsanor5@gmail.com and Touba
  await purgeEmailAndEstablishment("gsanor5@gmail.com", "Touba");

  console.log("\n=== REMAINING USERS IN DATABASE ===");
  const remaining = await prisma.user.findMany({
    select: { id: true, username: true, email: true, name: true, establishment: { select: { name: true } } },
  });
  console.log(remaining);

  console.log("\n=== REMAINING RESET TOKENS ===");
  const tokens = await prisma.passwordResetToken.findMany();
  console.log(tokens);

  await prisma.$disconnect();
}

main().catch(console.error);
