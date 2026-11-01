import type { ComponentType, SVGProps } from "react";

/**
 * StatCard — Composant de tuile statistique inspiré des maquettes M.N.D.
 * Chiffres tabulaires, icônes vectorielles en boîte arrondie et badge de sous-titre.
 */
export function StatCard({
  label,
  value,
  sub,
  color,
  bg,
  icon: Icon,
  iconBg,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bg?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconBg?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/15 bg-surface-raised/95 p-4 shadow-sm backdrop-blur-md transition-all hover:border-border/20 hover:shadow-md ${className}`}
      style={bg ? { background: bg } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-fg/60">
          {label}
        </p>
        {Icon ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs"
            style={{
              background: iconBg ?? "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Icon className="h-4 w-4" style={color ? { color } : undefined} />
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p
          className={`text-2xl font-black tracking-tight ${color ? "" : "text-fg"}`}
          style={color ? { color } : undefined}
        >
          {value}
        </p>
      </div>

      {sub ? (
        <p
          className="mt-1 text-[11px] font-bold text-fg/50 flex items-center gap-1"
          style={color ? { color } : undefined}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
