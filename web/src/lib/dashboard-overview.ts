import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { getPropertyStatuses } from "@/lib/property-status";
import { getRentalPaymentSummaries } from "@/lib/payment-summary";
import {
  getFinancialSummary,
  getTodayArrivals,
  getTodayDepartures,
  getWeeklyFinancialTrend,
  type DailyFinancialPoint,
} from "@/lib/dashboard-data";
import {
  countUnits,
  pickRecentOccupied,
  summarizeReceivables,
  yearRange,
  type UnitCounts,
  type UnitStatus,
  type UnitType,
} from "@/lib/dashboard-metrics";

/**
 * Lecture unique des chiffres des trois tableaux de bord (Résidence, Hôtel, Agence). Les trois
 * modes partagent le même moteur d'hébergement : seule la présentation change. Aucun chiffre n'est
 * inventé ni stocké ; tout est calculé à la lecture, par les services existants :
 *   - statut des logements : `getPropertyStatuses` (jamais stocké) ;
 *   - recettes et dépenses : somme des paiements/dépenses par date réelle (`getFinancialSummary`) ;
 *   - soldes : `getRentalPaymentSummaries` (source unique du restant dû).
 * L'espace vient de la session (`getCurrentUser`), jamais du navigateur.
 */

const LIST_LIMIT = 500;

export type DashboardUnit = { id: string; name: string; type: UnitType; status: UnitStatus };

export type DashboardStay = {
  id: string;
  propertyName: string;
  clientName: string | null;
  type: UnitType;
  arrivalAt: Date;
  plannedDepartureAt: Date;
  amount: number;
  remaining: number;
};

export type DashboardArrival = {
  id: string;
  propertyName: string;
  clientName: string | null;
  arrivalTime: Date;
  status: string;
};

export type DashboardOverview = {
  spaceName: string;
  userName: string;
  now: Date;
  units: DashboardUnit[];
  counts: { rooms: UnitCounts; apartments: UnitCounts; all: UnitCounts };
  activeStays: DashboardStay[];
  arrivals: DashboardArrival[];
  departures: DashboardStay[];
  upcomingReservations: number;
  revenue: { today: number; month: number; year: number; paymentCountToday: number };
  expenses: { today: number; month: number };
  receivables: { total: number; count: number; top: DashboardStay[] };
  recentRooms: DashboardStay[];
  recentApartments: DashboardStay[];
  weekly: DailyFinancialPoint[];
  clientCount: number;
};

export async function getDashboardOverview(now: Date = new Date()): Promise<DashboardOverview> {
  const user = await getCurrentUser();
  const establishmentId = user.establishmentId;
  if (!establishmentId) {
    throw new Error("Aucun espace actif : le tableau de bord exige un espace.");
  }

  const year = yearRange(now);

  const [
    establishment,
    properties,
    rentals,
    financial,
    weekly,
    arrivalRows,
    departureRows,
    revenueYear,
    clientCount,
    upcomingReservations,
  ] = await Promise.all([
    prisma.establishment.findFirst({ where: { id: establishmentId }, select: { name: true } }),
    prisma.property.findMany({
      where: { establishmentId },
      select: { id: true, name: true, type: true, active: true },
      orderBy: { name: "asc" },
      take: LIST_LIMIT,
    }),
    prisma.rental.findMany({
      where: { establishmentId, status: "ACTIVE" },
      select: {
        id: true,
        amount: true,
        reservationId: true,
        arrivalAt: true,
        plannedDepartureAt: true,
        property: { select: { name: true, type: true } },
        client: { select: { name: true } },
      },
      orderBy: { plannedDepartureAt: "asc" },
      take: LIST_LIMIT,
    }),
    getFinancialSummary(now),
    getWeeklyFinancialTrend(now),
    getTodayArrivals(),
    getTodayDepartures(now),
    prisma.payment.aggregate({ where: { establishmentId, paidAt: year }, _sum: { amount: true } }),
    prisma.client.count({ where: { establishmentId } }),
    prisma.reservation.count({
      where: { establishmentId, status: "CONFIRMED", arrivalTime: { gte: now } },
    }),
  ]);

  const statuses = await getPropertyStatuses(
    properties.map((p) => ({ id: p.id, active: p.active })),
    now,
  );
  const units: DashboardUnit[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    status: statuses.get(p.id) ?? "AVAILABLE",
  }));

  const summaries = await getRentalPaymentSummaries(
    prisma,
    rentals.map((r) => ({ id: r.id, amount: r.amount, reservationId: r.reservationId })),
  );
  const activeStays: DashboardStay[] = rentals.map((r) => ({
    id: r.id,
    propertyName: r.property.name,
    clientName: r.client?.name ?? null,
    type: r.property.type,
    arrivalAt: r.arrivalAt,
    plannedDepartureAt: r.plannedDepartureAt,
    amount: r.amount,
    remaining: summaries.get(r.id)?.remaining ?? 0,
  }));

  // Départs du jour : séjours actifs dont le départ prévu tombe aujourd'hui (même règle que
  // `getTodayDepartures`, qui reste la référence ; on rattache ici le restant dû).
  const departureIds = new Set(departureRows.map((d) => d.id));
  const departures = activeStays.filter((stay) => departureIds.has(stay.id));

  const receivables = summarizeReceivables(activeStays);

  return {
    spaceName: establishment?.name ?? "Mon espace",
    userName: user.name,
    now,
    units,
    counts: countUnits(units),
    activeStays,
    arrivals: arrivalRows
      .filter((r) => r.status !== "CANCELLED")
      .map((r) => ({
        id: r.id,
        propertyName: r.property.name,
        clientName: r.client?.name ?? null,
        arrivalTime: r.arrivalTime,
        status: r.status,
      })),
    departures,
    upcomingReservations,
    revenue: {
      today: financial.revenueToday,
      month: financial.revenueMonth,
      year: revenueYear._sum.amount ?? 0,
      paymentCountToday: financial.paymentCountToday,
    },
    expenses: { today: financial.expenseToday, month: financial.expenseMonth },
    receivables: { total: receivables.total, count: receivables.count, top: receivables.top },
    recentRooms: pickRecentOccupied(activeStays, "ROOM"),
    recentApartments: pickRecentOccupied(activeStays, "APARTMENT"),
    weekly,
    clientCount,
  };
}
