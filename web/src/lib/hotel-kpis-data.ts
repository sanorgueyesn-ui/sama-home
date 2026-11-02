import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { computeHotelKpis, type HotelKpis, type StayInterval } from "@/lib/hotel-metrics";

const STAY_LIMIT = 5_000;

/**
 * Indicateurs hôteliers d'une période. L'établissement vient de la session (ADMIN), jamais du
 * navigateur. Mode Hôtel uniquement : retourne null pour tout autre mode.
 */
export async function getHotelKpis(range: { gte: Date; lt: Date }, revenue: number, now: Date = new Date()): Promise<HotelKpis | null> {
  const user = await requireAdmin();
  const establishmentId = user.establishmentId;
  if (!establishmentId) return null;
  const establishment = await prisma.establishment.findUnique({ where: { id: establishmentId }, select: { businessMode: true } });
  if (establishment?.businessMode !== "HOTEL") return null;

  const [propertyCount, rentals] = await Promise.all([
    prisma.property.count({ where: { establishmentId, active: true } }),
    prisma.rental.findMany({
      where: { establishmentId, status: { not: "CANCELLED" }, arrivalAt: { lt: range.lt } },
      select: { propertyId: true, arrivalAt: true, plannedDepartureAt: true, actualDepartureAt: true, status: true },
      orderBy: { arrivalAt: "desc" },
      take: STAY_LIMIT,
    }),
  ]);
  const stays: StayInterval[] = rentals
    .map((r) => ({
      propertyId: r.propertyId,
      start: r.arrivalAt,
      // Terminé : départ réel. En cours : au moins jusqu'à maintenant (un séjour en retard occupe encore la chambre).
      end: r.actualDepartureAt ?? (r.plannedDepartureAt.getTime() > now.getTime() ? r.plannedDepartureAt : now),
    }))
    .filter((s) => s.end.getTime() > range.gte.getTime());
  return computeHotelKpis({ from: range.gte, to: range.lt, now, propertyCount, stays, revenue });
}
