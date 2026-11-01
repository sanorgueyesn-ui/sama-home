// Calculs purs des tableaux de bord (Résidence, Hôtel, Agence). Aucune base, aucun accès à la
// session : tout ce qui est ici se teste seul. La lecture des données est dans
// `dashboard-overview.ts`, qui passe par les services existants (property-status, payment-summary).

export type UnitType = "ROOM" | "APARTMENT";
export type UnitStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNAVAILABLE";

export type UnitCounts = {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  unavailable: number;
};

export const EMPTY_UNIT_COUNTS: UnitCounts = { total: 0, available: 0, occupied: 0, reserved: 0, unavailable: 0 };

const STATUS_KEY: Record<UnitStatus, Exclude<keyof UnitCounts, "total">> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "reserved",
  UNAVAILABLE: "unavailable",
};

/** Compte les logements par statut, séparément pour les chambres, les appartements et l'ensemble. */
export function countUnits(units: { type: UnitType; status: UnitStatus }[]): {
  rooms: UnitCounts;
  apartments: UnitCounts;
  all: UnitCounts;
} {
  const rooms = { ...EMPTY_UNIT_COUNTS };
  const apartments = { ...EMPTY_UNIT_COUNTS };
  const all = { ...EMPTY_UNIT_COUNTS };
  for (const unit of units) {
    const key = STATUS_KEY[unit.status];
    for (const bucket of [unit.type === "ROOM" ? rooms : apartments, all]) {
      bucket.total += 1;
      bucket[key] += 1;
    }
  }
  return { rooms, apartments, all };
}

/**
 * Taux d'occupation en % : logements occupés sur logements exploitables. Un logement indisponible
 * (désactivé) ne compte pas au dénominateur : il ne peut pas être loué. 0 s'il n'y a rien à louer.
 */
export function occupancyRate(counts: UnitCounts): number {
  const rentable = counts.total - counts.unavailable;
  if (rentable <= 0) return 0;
  return Math.round((counts.occupied / rentable) * 100);
}

export type Receivable = { id: string; remaining: number };

/** Solde total à recouvrer, nombre de séjours concernés et les `limit` plus gros soldes. */
export function summarizeReceivables<T extends Receivable>(
  rows: T[],
  limit = 5,
): { total: number; count: number; top: T[] } {
  const owing = rows.filter((row) => row.remaining > 0);
  return {
    total: owing.reduce((sum, row) => sum + row.remaining, 0),
    count: owing.length,
    top: [...owing].sort((a, b) => b.remaining - a.remaining).slice(0, limit),
  };
}

/** Les `limit` séjours les plus récents d'un type de logement, du plus récent au plus ancien. */
export function pickRecentOccupied<T extends { type: UnitType; arrivalAt: Date }>(
  rentals: T[],
  type: UnitType,
  limit = 5,
): T[] {
  return rentals
    .filter((rental) => rental.type === type)
    .sort((a, b) => b.arrivalAt.getTime() - a.arrivalAt.getTime())
    .slice(0, limit);
}

/** Montant en FCFA, séparateur de milliers français : « 3 450 000 ». */
export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/[  ]/g, " ");
}

/** Durée écoulée lisible : « 12 min », « 3 h 25 min », « 1 j 12 h ». Jamais négative. */
export function formatElapsed(from: Date, now: Date): string {
  const totalMinutes = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  return `${minutes} min`;
}

/** [1er janvier, 1er janvier suivant) en heure locale du serveur, comme `monthRange`. */
export function yearRange(now: Date = new Date()): { gte: Date; lt: Date } {
  return { gte: new Date(now.getFullYear(), 0, 1), lt: new Date(now.getFullYear() + 1, 0, 1) };
}
