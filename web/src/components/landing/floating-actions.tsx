"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BOTTOM_ZONE_PX = 96;

export function FloatingActions() {
  const [inHero, setInHero] = useState(true);
  const [inFooter, setInFooter] = useState(false);
  const hidden = inHero || inFooter;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const rootMargin = `0px 0px -${BOTTOM_ZONE_PX}px 0px`;
    const watch = (id: string, set: (value: boolean) => void) => {
      const element = document.getElementById(id);
      if (!element) {
        set(false);
        return null;
      }
      const observer = new IntersectionObserver(([entry]) => set(entry.isIntersecting), { rootMargin });
      observer.observe(element);
      return observer;
    };
    const hero = watch("accueil", setInHero);
    const footer = watch("contact", setInFooter);
    return () => {
      hero?.disconnect();
      footer?.disconnect();
    };
  }, []);

  return (
    <aside
      aria-label="Accès rapide à l'application"
      className={`fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 transition-all duration-300 ${
        hidden ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <Link
        href="/login"
        className="group inline-flex items-center gap-2 rounded-full border border-border/30 bg-surface/95 px-4 py-2.5 text-xs sm:text-sm font-bold text-fg shadow-lg backdrop-blur-md hover:bg-surface-raised transition-all"
      >
        <span className="flex h-2 w-2 rounded-full bg-(--accent)" />
        <span className="hidden sm:inline">Accéder à l&apos;application</span>
        <span className="sm:hidden">Accéder à l&apos;app</span>
        <svg className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </Link>
    </aside>
  );
}
