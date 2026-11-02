import type { ReactNode } from "react";
import { T } from "@/components/i18n/i18n-provider";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-app-line-strong px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-app-line bg-app-panel text-app-faint">{icon}</div>
      <p className="text-base font-extrabold text-app-text"><T>{title}</T></p>
      <p className="mt-1.5 max-w-xs text-sm text-app-muted"><T>{description}</T></p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
