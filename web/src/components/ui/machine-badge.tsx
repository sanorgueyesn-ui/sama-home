import { T } from "@/components/i18n/i18n-provider";

export function MachineConnectedBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-bold text-app-good backdrop-blur-sm shadow-sm ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
      <span><T>Machine connectée</T></span>
    </div>
  );
}
