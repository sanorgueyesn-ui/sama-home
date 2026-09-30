import { Card } from "@/components/ui/card";

/** Small reusable stat tile — used for the financial and logements sections. */
export function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color?: string;
  bg?: string;
}) {
  return (
    <Card className="px-4 py-3.5" style={bg ? { background: bg } : undefined}>
      <p className="text-[11px] font-bold text-navy/50">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${color ? "" : "text-navy"}`} style={color ? { color } : undefined}>
        {value}
      </p>
    </Card>
  );
}
