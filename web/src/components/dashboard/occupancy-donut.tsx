"use client";

export function OccupancyDonut({
  total,
  available,
  occupied,
  reserved,
}: {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
}) {
  const safeTotal = total > 0 ? total : 1;
  const pAvailable = Math.round((available / safeTotal) * 100);
  const pOccupied = Math.round((occupied / safeTotal) * 100);
  const pReserved = Math.round((reserved / safeTotal) * 100);

  const offsetAvailable = 0;
  const offsetOccupied = -pAvailable;
  const offsetReserved = -(pAvailable + pOccupied);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-fg/5"
          />
          {pAvailable > 0 && (
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="4"
              strokeDasharray={`${pAvailable} ${100 - pAvailable}`}
              strokeDashoffset={offsetAvailable}
              className="transition-all duration-700 ease-out"
            />
          )}
          {pOccupied > 0 && (
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="4"
              strokeDasharray={`${pOccupied} ${100 - pOccupied}`}
              strokeDashoffset={offsetOccupied}
              className="transition-all duration-700 ease-out"
            />
          )}
          {pReserved > 0 && (
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray={`${pReserved} ${100 - pReserved}`}
              strokeDashoffset={offsetReserved}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-fg leading-none">{total}</span>
          <span className="text-[10px] font-extrabold text-fg/50 uppercase tracking-wider mt-0.5">Biens</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full text-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/10">
          <span className="flex items-center gap-2 text-fg/80 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            Disponibles
          </span>
          <span className="font-extrabold text-fg">{available} <span className="text-[11px] font-semibold text-emerald-400">({pAvailable}%)</span></span>
        </div>
        <div className="flex items-center justify-between pb-1.5 border-b border-border/10">
          <span className="flex items-center gap-2 text-fg/80 font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            Occupés
          </span>
          <span className="font-extrabold text-fg">{occupied} <span className="text-[11px] font-semibold text-rose-400">({pOccupied}%)</span></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-fg/80 font-medium">
            <span className="h-2 w-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
            Réservés
          </span>
          <span className="font-extrabold text-fg">{reserved} <span className="text-[11px] font-semibold text-sky-400">({pReserved}%)</span></span>
        </div>
      </div>
    </div>
  );
}
