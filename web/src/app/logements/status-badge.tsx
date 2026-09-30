import { PROPERTY_STATUS_META, type PropertyStatus } from "@/lib/property-status";

export function StatusBadge({ status }: { status: PropertyStatus }) {
  const meta = PROPERTY_STATUS_META[status];
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: meta.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}
