import type { ComponentProps } from "react";

// Même panneau que le tableau de bord : fond de panneau, bordure fine, pas d'ombre portée.
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-app-line bg-app-panel ${className}`} {...props} />;
}
