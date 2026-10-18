"use client";

import { useEffect, useRef, useState } from "react";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAY_NAMES = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTimeIso(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "Sélectionner une date";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(year, month, day);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

// ---------------------------------------------------------------------------
// LuxuryDatePicker
// ---------------------------------------------------------------------------
export type LuxuryDatePickerProps = {
  name: string;
  value: string;
  onChange: (dateIso: string) => void;
  label?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
};

export function LuxuryDatePicker({
  name,
  value,
  onChange,
  label,
  minDate,
  maxDate,
  error,
  className = "",
  disabled = false,
}: LuxuryDatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive initial calendar month/year
  const [viewState, setViewState] = useState(() => {
    const parts = value ? value.split("-") : [];
    if (parts.length === 3) {
      return { year: Number(parts[0]), month: Number(parts[1]) - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year: viewYear, month: viewMonth } = viewState;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function prevMonth() {
    setViewState((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setViewState((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  // Days in month calculation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const days: { day: number; dateIso: string; isDisabled: boolean; isToday: boolean; isSelected: boolean }[] = [];
  const today = todayIso();

  for (let i = 1; i <= daysInMonth; i++) {
    const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(i)}`;
    const isDisabled = Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
    days.push({
      day: i,
      dateIso: iso,
      isDisabled,
      isToday: iso === today,
      isSelected: iso === value,
    });
  }

  function handleSelectDate(iso: string) {
    onChange(iso);
    const parts = iso.split("-");
    if (parts.length === 3) {
      setViewState({ year: Number(parts[0]), month: Number(parts[1]) - 1 });
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="mb-1.5 block text-xs font-bold text-fg">{label}</label>}

      {/* Hidden input for Native Form Submit */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-surface-raised px-3.5 text-sm font-semibold transition-all hover:border-brand-orange/40 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${open ? "border-brand-orange shadow-md" : ""}`}
      >
        <span className="flex items-center gap-2 text-fg">
          <span className="text-base">📅</span>
          <span className={value ? "font-bold text-white" : "text-fg/50"}>{formatDateDisplay(value)}</span>
        </span>
        <span className="text-xs text-fg/40">▼</span>
      </button>

      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

      {/* Dark Luxury Calendar Popover */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/15 bg-surface-raised/98 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year & Arrows */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-fg hover:bg-surface hover:text-white"
            >
              ←
            </button>
            <span className="text-sm font-black text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-fg hover:bg-surface hover:text-white"
            >
              →
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => handleSelectDate(today)}
              className="flex-1 rounded-lg border border-white/10 bg-surface-sunken py-1 text-[11px] font-bold text-fg/80 hover:bg-surface hover:text-brand-orange"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleSelectDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
              }}
              className="flex-1 rounded-lg border border-white/10 bg-surface-sunken py-1 text-[11px] font-bold text-fg/80 hover:bg-surface hover:text-brand-orange"
            >
              Demain
            </button>
          </div>

          {/* Day of week headers */}
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-fg/40">
            {DAY_NAMES.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`blank-${i}`} className="h-9 w-9" />
            ))}

            {days.map((item) => (
              <button
                key={item.dateIso}
                type="button"
                disabled={item.isDisabled}
                onClick={() => handleSelectDate(item.dateIso)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  item.isDisabled
                    ? "cursor-not-allowed opacity-20 text-fg/30"
                    : item.isSelected
                      ? "bg-brand-orange text-ink font-black shadow-md shadow-brand-orange/30 scale-105"
                      : item.isToday
                        ? "border border-brand-orange/60 text-brand-orange hover:bg-white/10"
                        : "text-fg/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LuxuryTimePicker
// ---------------------------------------------------------------------------
export type LuxuryTimePickerProps = {
  name: string;
  value: string; // HH:MM
  onChange: (time: string) => void;
  label?: string;
  selectedDate?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
};

const COMMON_TIMES = ["08:00", "10:00", "12:00", "14:00", "15:00", "18:00", "20:00", "22:00"];

export function LuxuryTimePicker({
  name,
  value,
  onChange,
  label,
  selectedDate,
  error,
  className = "",
  disabled = false,
}: LuxuryTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Directly derive hour and minute from value without useEffect
  const [hour, minute] = value ? value.split(":") : ["15", "00"];
  const currentHourVal = hour || "15";
  const currentMinuteVal = minute || "00";

  const today = todayIso();
  const isToday = selectedDate === today;
  const currentNow = new Date();
  const nowHour = currentNow.getHours();
  const nowMinute = currentNow.getMinutes();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function isTimeInPast(h: number, m: number = 0): boolean {
    if (!isToday) return false;
    if (h < nowHour) return true;
    if (h === nowHour && m < nowMinute) return true;
    return false;
  }

  function handleSetTime(h: string, m: string) {
    onChange(`${pad(Number(h))}:${pad(Number(m))}`);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="mb-1.5 block text-xs font-bold text-fg">{label}</label>}

      {/* Hidden input for Native Form Submit */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-surface-raised px-3.5 text-sm font-semibold transition-all hover:border-brand-orange/40 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${open ? "border-brand-orange shadow-md" : ""}`}
      >
        <span className="flex items-center gap-2 text-fg">
          <span className="text-base">🕒</span>
          <span className={value ? "font-mono font-bold text-white text-base" : "text-fg/50"}>
            {value || "15:00"}
          </span>
        </span>
        <span className="text-xs text-fg/40">▼</span>
      </button>

      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

      {/* Dark Luxury Time Popover */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/15 bg-surface-raised/98 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-fg/70">Choisir l&apos;heure</span>
            {isToday ? (
              <button
                type="button"
                onClick={() => {
                  handleSetTime(String(nowHour), String(nowMinute));
                  setOpen(false);
                }}
                className="rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/25"
              >
                ⚡ Maintenant
              </button>
            ) : null}
          </div>

          {/* Quick time chips */}
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-fg/40 mb-1.5">Créneaux fréquents</p>
            <div className="grid grid-cols-4 gap-1.5">
              {COMMON_TIMES.map((t) => {
                const [h, m] = t.split(":").map(Number);
                const disabledChip = isTimeInPast(h, m);
                const isSelected = value === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={disabledChip}
                    onClick={() => {
                      handleSetTime(String(h), String(m));
                      setOpen(false);
                    }}
                    className={`rounded-lg py-1 font-mono text-xs font-bold transition-all ${
                      disabledChip
                        ? "opacity-20 cursor-not-allowed bg-surface-sunken text-fg/30"
                        : isSelected
                          ? "bg-brand-orange text-ink font-black shadow-sm"
                          : "bg-surface-sunken text-fg/80 hover:bg-surface hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Selector: Hours & Minutes */}
          <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
            {/* Hours list */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg/40 mb-1">Heure</p>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-white/5 bg-surface-sunken/60 p-1 space-y-1 scrollbar-thin">
                {Array.from({ length: 24 }).map((_, i) => {
                  const hourStr = pad(i);
                  const isPast = isToday && i < nowHour;
                  const isSelected = currentHourVal === hourStr;
                  return (
                    <button
                      key={hourStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleSetTime(hourStr, currentMinuteVal)}
                      className={`w-full rounded-lg py-1 font-mono text-xs font-bold transition-all ${
                        isPast
                          ? "opacity-20 cursor-not-allowed text-fg/30"
                          : isSelected
                            ? "bg-brand-orange text-ink font-black"
                            : "text-fg/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {hourStr} h
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes list */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg/40 mb-1">Minute</p>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-white/5 bg-surface-sunken/60 p-1 space-y-1 scrollbar-thin">
                {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((minStr) => {
                  const isPast = isToday && Number(currentHourVal) === nowHour && Number(minStr) < nowMinute;
                  const isSelected = currentMinuteVal === minStr;
                  return (
                    <button
                      key={minStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => handleSetTime(currentHourVal, minStr)}
                      className={`w-full rounded-lg py-1 font-mono text-xs font-bold transition-all ${
                        isPast
                          ? "opacity-20 cursor-not-allowed text-fg/30"
                          : isSelected
                            ? "bg-brand-orange text-ink font-black"
                            : "text-fg/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {minStr} min
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3.5 w-full rounded-xl bg-surface py-2 text-xs font-bold text-fg hover:bg-white/10 transition-colors"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}
