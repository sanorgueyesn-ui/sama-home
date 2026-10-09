import type { ReactNode } from "react";

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
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-fg/40 shadow-card">
        {icon}
      </div>
      <p className="text-base font-extrabold text-fg">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-fg/60">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
