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
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-navy/40 shadow-[0_1px_2px_rgba(18,48,74,0.05),0_8px_20px_rgba(18,48,74,0.06)]">
        {icon}
      </div>
      <p className="text-base font-extrabold text-navy">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-navy/60">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
