import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/card";

/** Small reusable stat tile — used for the financial and logements sections. */
export function StatCard({
  label,
  value,
  color,
  bg,
  icon: Icon,
  iconBg,
}: {
  label: string;
  value: string;
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
}) {
  return (
    <Card className="px-4 py-3.5" style={bg ? { background: bg } : undefined}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg md:h-6 md:w-6 md:rounded-md"
            style={iconBg ? { background: iconBg } : undefined}
          >
            <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" style={color ? { color } : undefined} />
          </span>
        ) : null}
        <p className="text-[11px] font-bold text-navy/50">{label}</p>
      </div>
      <p className={`mt-1 text-xl font-extrabold ${color ? "" : "text-navy"}`} style={color ? { color } : undefined}>
        {value}
      </p>
    </Card>
  );
}
