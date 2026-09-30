import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-[0_1px_2px_rgba(18,48,74,0.05),0_8px_20px_rgba(18,48,74,0.06)] ${className}`}
      {...props}
    />
  );
}
