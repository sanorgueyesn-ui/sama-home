"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/i18n-provider";

export function ClientSearchInput({ defaultValue }: { defaultValue: string }) {
  const t = useT();
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.replace(params.size ? `${pathname}?${params}` : pathname);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-app-line-strong bg-app-panel px-3.5 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/40">
      <svg
        aria-hidden="true"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-app-faint"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("Rechercher un client (nom ou téléphone)...")}
        aria-label={t("Rechercher un client par nom ou téléphone")}
        className="flex-1 bg-transparent text-sm text-app-text outline-none placeholder:text-app-faint"
      />
    </div>
  );
}
