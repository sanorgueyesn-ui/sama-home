"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

export type StayCountdownProps = {
  arrivalAt: string | number | Date;
  plannedDepartureAt: string | number | Date;
  variant?: "compact" | "banner" | "card";
  clientName?: string | null;
  clientPhone?: string | null;
  rentalId?: string;
  propertyName?: string;
  className?: string;
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatTimeOnlyFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function subscribe(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getClientNow() {
  return Date.now();
}

function getServerNow() {
  return 0;
}

export function StayCountdown({
  arrivalAt,
  plannedDepartureAt,
  variant = "compact",
  clientName,
  clientPhone,
  rentalId,
  propertyName,
  className = "",
}: StayCountdownProps) {
  const now = useSyncExternalStore(subscribe, getClientNow, getServerNow);
  const mounted = now > 0;

  const startDate = new Date(arrivalAt);
  const endDate = new Date(plannedDepartureAt);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const totalDuration = Math.max(1000, endMs - startMs);
  const elapsed = Math.max(0, now - startMs);
  const rawProgress = Math.round((elapsed / totalDuration) * 100);
  const progress = Math.min(100, Math.max(0, rawProgress));

  const diffMs = endMs - now;
  const isOverdue = diffMs <= 0;
  const isUrgent = !isOverdue && diffMs < 2 * 3600 * 1000; // moins de 2h

  // Format countdown string
  let countdownFormatted = "";
  let fullDigitalTimer = "";

  if (isOverdue) {
    const overdueSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const h = Math.floor(overdueSeconds / 3600);
    const m = Math.floor((overdueSeconds % 3600) / 60);
    const s = overdueSeconds % 60;
    countdownFormatted = h > 0 ? `+${h}h ${pad(m)}m` : `+${m}m ${pad(s)}s`;
    fullDigitalTimer = `+ ${pad(h)}:${pad(m)}:${pad(s)}`;
  } else {
    const remSeconds = Math.floor(diffMs / 1000);
    const d = Math.floor(remSeconds / 86400);
    const h = Math.floor((remSeconds % 86400) / 3600);
    const m = Math.floor((remSeconds % 3600) / 60);
    const s = remSeconds % 60;

    if (d > 0) {
      countdownFormatted = `${d}j ${h}h ${pad(m)}m`;
      fullDigitalTimer = `${d}j ${pad(h)}:${pad(m)}:${pad(s)}`;
    } else {
      countdownFormatted = `${h}h ${pad(m)}m ${pad(s)}s`;
      fullDigitalTimer = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
  }

  // Theme colors
  const statusTheme = isOverdue
    ? {
        pulseBg: "bg-rose-500",
        dotBg: "bg-rose-400",
        text: "text-rose-400",
        badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        progressBar: "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]",
        glow: "border-rose-500/30",
        label: "Sortie dépassée",
      }
    : isUrgent
      ? {
          pulseBg: "bg-amber-400",
          dotBg: "bg-amber-400",
          text: "text-amber-400",
          badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          progressBar: "bg-gradient-to-r from-amber-500 to-brand-orange shadow-[0_0_12px_rgba(245,158,11,0.4)]",
          glow: "border-amber-500/30",
          label: "Départ imminent",
        }
      : {
          pulseBg: "bg-emerald-400",
          dotBg: "bg-emerald-400",
          text: "text-emerald-400",
          badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          progressBar: "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
          glow: "border-emerald-500/30",
          label: "Séjour en cours",
        };

  if (!mounted) {
    // Initial server-side / unmounted skeleton to avoid hydration mismatches
    return (
      <div className={`rounded-xl border border-white/10 bg-surface-sunken/60 p-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-fg/60">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span>Calcul du décompte...</span>
          </span>
          <span className="text-[10px] font-bold text-fg/40">...%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 bg-white/20" />
        </div>
      </div>
    );
  }

  // 1. Compact variant: for Room cards in dashboard grid
  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl border ${statusTheme.glow} bg-black/40 backdrop-blur-md p-2.5 transition-all ${className}`}
      >
        <div className="flex items-center justify-between gap-1 text-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusTheme.pulseBg}`}
              />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusTheme.dotBg}`} />
            </span>
            <span className={`truncate text-[11px] font-bold ${statusTheme.text}`}>
              {isOverdue ? `Sortie dépassée (+${countdownFormatted})` : `Sortie dans ${countdownFormatted}`}
            </span>
          </div>
          <span className="shrink-0 text-[10.5px] font-black text-white/80">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusTheme.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {clientName ? (
          <p className="mt-1.5 truncate text-[10px] font-medium text-white/60">
            Occupant : <span className="font-bold text-white/90">{clientName}</span>
          </p>
        ) : null}
      </div>
    );
  }

  // 2. Lateral Card variant: for Lateral Panel on Dashboard
  if (variant === "card") {
    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border ${statusTheme.glow} bg-surface-raised/90 p-3.5 backdrop-blur-md shadow-sm transition-all hover:border-brand-orange/40 ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusTheme.pulseBg}`}
              />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusTheme.dotBg}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-fg">{propertyName ?? "Chambre"}</p>
              {clientName ? <p className="truncate text-[11px] text-fg/60">👤 {clientName}</p> : null}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusTheme.badgeBg}`}>
            {statusTheme.label}
          </span>
        </div>

        <div className="mt-2.5 flex items-baseline justify-between text-xs">
          <span className={`font-mono text-sm font-black ${statusTheme.text}`}>
            {fullDigitalTimer}
          </span>
          <span className="text-[11px] font-bold text-fg/50">{progress}% écoulé</span>
        </div>

        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusTheme.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-fg/50">
          <span>Sortie : {formatTimeOnlyFr(endDate)}</span>
          {rentalId ? (
            <Link
              href={`/locations/${rentalId}`}
              className="font-bold text-brand-orange hover:underline"
            >
              Gérer départ →
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  // 3. Banner variant: for Room Detail Page (/logements/[id])
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${statusTheme.glow} bg-gradient-to-br from-surface-raised via-surface-raised/95 to-navy/80 p-5 shadow-xl backdrop-blur-md ${className}`}
    >
      {/* Ambient background glow */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl ${statusTheme.pulseBg}`}
      />

      {/* Header with status badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusTheme.pulseBg}`}
            />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${statusTheme.dotBg}`} />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-fg">
            {statusTheme.label} · Décompte avant libération
          </span>
        </div>

        {clientName ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-surface-sunken px-3 py-1 text-xs font-bold text-fg">
              👤 {clientName}
            </span>
            {clientPhone ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${clientPhone}`}
                  className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-1 text-xs font-bold text-brand-orange hover:bg-brand-orange/20"
                >
                  📞 {clientPhone}
                </a>
                <a
                  href={`https://wa.me/${clientPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-emerald-500/40 bg-[#25D366]/15 px-2.5 py-1 text-xs font-bold text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                  title="Contacter sur WhatsApp"
                >
                  💬 WhatsApp
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Digital Countdown Display */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg/50">
            {isOverdue ? "Dépassement de séjour constaté" : "Temps restant jusqu'au check-out"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${statusTheme.text}`}>
              {fullDigitalTimer}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-3 sm:text-right">
          <p className="text-[11px] font-bold uppercase text-fg/50">Date &amp; heure de sortie prévue</p>
          <p className="mt-0.5 text-sm font-extrabold text-fg">{formatDateFr(endDate)}</p>
          <p className="mt-0.5 text-xs font-medium text-fg/60">
            Arrivé le {formatDateFr(startDate)}
          </p>
        </div>
      </div>

      {/* Progress Bar with markers */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-fg/70">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Check-in : {formatTimeOnlyFr(startDate)}
          </span>
          <span className="font-extrabold text-brand-orange">{progress}% du séjour écoulé</span>
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${statusTheme.dotBg}`} />
            Check-out : {formatTimeOnlyFr(endDate)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusTheme.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      {rentalId ? (
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border/10 pt-4">
          <Link
            href={`/locations/${rentalId}`}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-brand-orange px-4 text-xs font-bold text-ink shadow-sm hover:brightness-110"
          >
            🔑 Gérer la sortie (Check-out)
          </Link>
          <Link
            href={`/locations/${rentalId}/extend`}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border/15 bg-surface-sunken px-4 text-xs font-bold text-fg hover:bg-surface-raised"
          >
            ⏳ Prolonger le séjour
          </Link>
        </div>
      ) : null}
    </div>
  );
}
