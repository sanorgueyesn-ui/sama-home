import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl bg-surface-raised shadow-card ${className}`}
      {...props}
    />
  );
}
