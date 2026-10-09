import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/card";

/** Small reusable stat tile — used for the financial and logements sections. */
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
  /** Petite annotation sous la valeur (maquette Stitch) — ex. un
   * pourcentage calculé localement à partir de compteurs réels déjà
   * chargés, ou un libellé comme "Total gérés". Jamais un chiffre inventé. */
  sub?: string;
  color?: string;
  bg?: string;
  /** Optional pictogram, shown inside a small pastel badge (`iconBg`) next
   * to the label. Same instance on every breakpoint — only its size changes
   * responsively via CSS (color stays the card's own functional color on
   * all 3 widths, per the validated badge direction). */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Badge background — a light/pastel tone, reusing existing tokens
   * (e.g. the same hex as --color-success-bg/--color-danger-bg/--color-info-bg). */
  iconBg?: string;
  /** Extra classes on the outer Card — e.g. `col-span-2` to let one tile
   * span a wider slot in a grid (Reconstruction UI, Accueil mobile). */
  className?: string;
}) {
  return (
    <Card
      className={`border border-border/10 px-4 py-3.5 ${className}`}
      style={bg ? { background: bg } : undefined}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg md:h-6 md:w-6 md:rounded-md"
            style={iconBg ? { background: iconBg } : undefined}
          >
            <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" style={color ? { color } : undefined} />
          </span>
        ) : null}
        <p className="text-[11px] font-bold text-fg/50">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-extrabold ${color ? "" : "text-fg"}`} style={color ? { color } : undefined}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] font-semibold text-fg/50">{sub}</p> : null}
    </Card>
  );
}
