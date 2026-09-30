/**
 * Phase 8, Bloc 5 — one-time, idempotent, transactional backfill converting
 * pre-Payment historical deposits into real Payment rows, so that
 * src/lib/payment-summary.ts (Payment-only) never has to also special-case
 * Reservation.deposit/Rental.deposit as a second source of truth.
 *
 * Safe to re-run at any time: a reservation/rental is only touched if it has
 * ZERO Payment rows so far — anything already represented (whether by an
 * earlier run of this script, or by the auto-created Payment that
 * createReservation/createRentalDirect now write at creation time, see
 * src/app/actions/reservations.ts and src/app/actions/rentals.ts) is left
 * alone.
 *
 * Rental.deposit is intentionally SKIPPED whenever `reservationId` is set:
 * for a rental born from "Faire entrer" (checkInReservation), Rental.deposit
 * is a verbatim COPY of Reservation.deposit — never independently collected
 * money — so migrating it too would double-count it alongside the payment
 * already migrated for the originating reservation. Only direct rentals
 * (reservationId = null) have their own deposit migrated.
 *
 * Run with: npx tsx prisma/backfill-payments.ts
 */
import "dotenv/config";
import { PrismaClient, type PaymentMethod } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const result = await prisma.$transaction(async (tx) => {
    let reservationsMigrated = 0;
    let rentalsMigrated = 0;

    const reservations = await tx.reservation.findMany({
      where: { deposit: { gt: 0 } },
      select: { id: true, deposit: true, depositMethod: true, createdAt: true },
    });
    for (const r of reservations) {
      const already = await tx.payment.count({ where: { reservationId: r.id } });
      if (already > 0) continue;
      await tx.payment.create({
        data: {
          reservationId: r.id,
          amount: r.deposit,
          method: (r.depositMethod ?? "OTHER") as PaymentMethod,
          paidAt: r.createdAt,
          note: r.depositMethod
            ? "Migration automatique — acompte historique."
            : "Migration automatique — acompte historique (méthode non renseignée).",
        },
      });
      reservationsMigrated++;
    }

    const directRentals = await tx.rental.findMany({
      where: { deposit: { gt: 0 }, reservationId: null },
      select: { id: true, deposit: true, createdAt: true },
    });
    for (const r of directRentals) {
      const already = await tx.payment.count({ where: { rentalId: r.id } });
      if (already > 0) continue;
      await tx.payment.create({
        data: {
          rentalId: r.id,
          amount: r.deposit,
          method: "OTHER",
          paidAt: r.createdAt,
          note: "Migration automatique — acompte historique (méthode non renseignée).",
        },
      });
      rentalsMigrated++;
    }

    return { reservationsMigrated, rentalsMigrated };
  });

  console.log(
    `Backfill terminé : ${result.reservationsMigrated} réservation(s) et ${result.rentalsMigrated} location(s) directe(s) migrée(s).`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
