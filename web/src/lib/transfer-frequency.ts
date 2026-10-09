import type { TransferFrequency } from "@/generated/prisma/client";

/**
 * Avance `current` d'EXACTEMENT une période selon `frequency` — toujours à
 * partir de l'échéance précédemment traitée, jamais à partir de `now` : un
 * rattrapage multi-échéances (voir `catchUpSchedule`,
 * src/lib/transfer-schedule-engine.ts) appelle cette fonction une fois par
 * échéance, dans l'ordre chronologique, pour ne jamais sauter ni répéter
 * une période. Fonction pure, sans dépendance Prisma/server-only (même
 * principe que src/lib/identity.ts et src/lib/retroactive-checkin.ts) —
 * testable isolément, y compris hors du runtime Next.js.
 */
export function advanceNextRunAt(current: Date, frequency: TransferFrequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY": {
      const day = next.getDate();
      const year = next.getFullYear();
      const targetMonthIndex = next.getMonth() + 1;
      const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0).getDate();
      next.setFullYear(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth));
      break;
    }
  }
  return next;
}
