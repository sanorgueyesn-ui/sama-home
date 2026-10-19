"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, SparklesIcon, AlertCircleIcon } from "@/components/ui/icons";

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

export function isoToFr(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export function formatFrFull(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return "";
  const str = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function frToIso(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Format compact 8 chiffres : JJMMAAAA (ex: 19102026)
  const compactMatch = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const d = Number(compactMatch[1]);
    const m = Number(compactMatch[2]);
    const y = Number(compactMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }

  // 2. Format JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA
  const frMatch4 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch4) {
    const d = Number(frMatch4[1]);
    const m = Number(frMatch4[2]);
    const y = Number(frMatch4[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }

  // 3. Format court avec année à 2 chiffres : JJ/MM/AA (ex: 19/10/26 -> 2026)
  const frMatch2 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (frMatch2) {
    const d = Number(frMatch2[1]);
    const m = Number(frMatch2[2]);
    const y = 2000 + Number(frMatch2[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }

  // 4. Format ISO standard : AAAA-MM-JJ ou AAAA/MM/JJ
  const isoMatch = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }

  return null;
}

export function parseTimeInput(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Format compact 4 chiffres : HHMM (ex: 1530 -> 15:30, 0800 -> 08:00)
  const compact = trimmed.match(/^(\d{2})(\d{2})$/);
  if (compact) {
    const h = Number(compact[1]);
    const m = Number(compact[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${pad(h)}:${pad(m)}`;
    }
  }

  // Format complet : HH:MM, HHhMM, HH.MM
  const full = trimmed.match(/^(\d{1,2})[:hH.](\d{1,2})$/);
  if (full) {
    const h = Number(full[1]);
    const m = Number(full[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${pad(h)}:${pad(m)}`;
    }
  }

  // Format heure seule : 15, 15h, 15H -> 15:00
  const hourOnly = trimmed.match(/^(\d{1,2})[hH]?$/);
  if (hourOnly) {
    const h = Number(hourOnly[1]);
    if (h >= 0 && h <= 23) {
      return `${pad(h)}:00`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// LuxuryDatePicker : Saisie manuelle directe ET calendrier popover sombre
// ---------------------------------------------------------------------------
export type LuxuryDatePickerProps = {
  name: string;
  value: string; // ISO YYYY-MM-DD
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

  // Valeur affichée dans le champ de saisie manuelle (format français JJ/MM/AAAA)
  const [inputText, setInputText] = useState(() => isoToFr(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputText(isoToFr(value));
  }

  // Vue mois/année pour le calendrier
  const [viewState, setViewState] = useState(() => {
    const parts = value ? value.split("-") : [];
    if (parts.length === 3) {
      return { year: Number(parts[0]), month: Number(parts[1]) - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year: viewYear, month: viewMonth } = viewState;

  // Fermeture automatique au clic en dehors
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

  // Saisie manuelle au clavier (immédiate)
  function handleManualInput(raw: string) {
    setInputText(raw);
    const parsedIso = frToIso(raw);
    if (parsedIso) {
      onChange(parsedIso);
      const parts = parsedIso.split("-");
      if (parts.length === 3) {
        setViewState({ year: Number(parts[0]), month: Number(parts[1]) - 1 });
      }
    }
  }

  // Normalisation à la perte de focus
  function handleBlur() {
    const parsedIso = frToIso(inputText);
    if (parsedIso) {
      setInputText(isoToFr(parsedIso));
      onChange(parsedIso);
    } else if (value) {
      setInputText(isoToFr(value));
    }
  }

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next && value) {
        const parts = value.split("-");
        if (parts.length === 3) {
          setViewState({ year: Number(parts[0]), month: Number(parts[1]) - 1 });
        }
      }
      return next;
    });
  }

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

  // Calcul de la grille des jours
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Lundi = 0
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
    setInputText(isoToFr(iso));
    const parts = iso.split("-");
    if (parts.length === 3) {
      setViewState({ year: Number(parts[0]), month: Number(parts[1]) - 1 });
    }
    setOpen(false);
  }

  const isPast = minDate && value && value < minDate;
  const friendlyFormatted = formatFrFull(value);

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? "z-50" : "z-20"} ${className}`}
    >
      {label && (
        <div className="mb-1.5 flex h-4 items-center justify-between">
          <label className="text-xs font-bold text-fg">{label}</label>
          {friendlyFormatted && !isPast ? (
            <span className="text-[11px] font-extrabold text-brand-orange truncate max-w-[55%] text-right">
              {friendlyFormatted}
            </span>
          ) : null}
        </div>
      )}

      {/* Input hidden pour l'envoi de formulaire natif au format ISO */}
      <input type="hidden" name={name} value={value} />

      {/* Zone de saisie combinée : Input texte direct + Bouton Calendrier parfaitement aligné */}
      <div
        className={`flex h-12 w-full items-stretch rounded-xl border bg-[#141d24] overflow-hidden transition-all ${
          open
            ? "border-brand-orange ring-2 ring-brand-orange/20 shadow-lg shadow-brand-orange/10"
            : "border-white/10 hover:border-white/20 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-1 items-center min-w-0 pl-3.5 pr-2">
          <CalendarIcon className="h-4 w-4 text-fg/60 select-none shrink-0 mr-2" />
          <input
            type="text"
            disabled={disabled}
            value={inputText}
            onChange={(e) => handleManualInput(e.target.value)}
            onBlur={handleBlur}
            placeholder="JJ/MM/AAAA"
            className="h-full w-full bg-transparent text-sm font-bold text-white placeholder:text-fg/30 outline-none"
          />
        </div>

        {/* Bouton d'ouverture du calendrier visuel (carré 48x48px aligné) */}
        <button
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          aria-label={open ? "Fermer le calendrier" : "Ouvrir le calendrier"}
          title={open ? "Fermer le calendrier" : "Ouvrir le calendrier"}
          className={`flex h-full w-12 shrink-0 items-center justify-center border-l border-white/10 transition-colors ${
            open
              ? "bg-brand-orange/20 text-brand-orange"
              : "bg-white/[0.03] text-fg/70 hover:bg-white/[0.08] hover:text-brand-orange"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : isPast ? (
        <p className="mt-1 text-xs font-medium text-danger flex items-center gap-1.5">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>Date antérieure à aujourd&apos;hui non autorisée</span>
        </p>
      ) : null}

      {/* Popover Calendrier Sombre Haute Définition */}
      {open && (
        <div className="absolute left-0 top-full z-[100] mt-2 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/20 bg-[#141d24] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Navigation Mois & Année */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-fg hover:bg-white/10 hover:text-white transition-colors"
            >
              ←
            </button>
            <span className="text-sm font-black text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-fg hover:bg-white/10 hover:text-white transition-colors"
            >
              →
            </button>
          </div>

          {/* Raccourcis Aujourd'hui / Demain */}
          <div className="mt-2.5 flex items-center justify-between gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => handleSelectDate(today)}
              className="flex-1 rounded-lg border border-white/10 bg-surface-sunken py-1.5 text-[11px] font-bold text-fg/80 hover:bg-white/10 hover:text-brand-orange transition-colors"
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
              className="flex-1 rounded-lg border border-white/10 bg-surface-sunken py-1.5 text-[11px] font-bold text-fg/80 hover:bg-white/10 hover:text-brand-orange transition-colors"
            >
              Demain
            </button>
          </div>

          {/* Entêtes jours de semaine */}
          <div className="mt-1.5 grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-fg/40">
            {DAY_NAMES.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Grille des jours */}
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
// LuxuryTimePicker : Saisie manuelle directe ET sélecteur d'heures sombre
// ---------------------------------------------------------------------------
export type LuxuryTimePickerProps = {
  name: string;
  value: string; // HH:MM
  onChange: (time: string) => void;
  label?: string;
  selectedDate?: string;
  allowPastTimes?: boolean;
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
  allowPastTimes = false,
  error,
  className = "",
  disabled = false,
}: LuxuryTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Valeur texte pour la saisie manuelle
  const [inputText, setInputText] = useState(value || "15:00");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputText(value || "15:00");
  }

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
    if (allowPastTimes) return false;
    if (!isToday) return false;
    if (h < nowHour) return true;
    if (h === nowHour && m < nowMinute) return true;
    return false;
  }

  function handleManualTime(raw: string) {
    setInputText(raw);
    const parsed = parseTimeInput(raw);
    if (parsed) {
      onChange(parsed);
    }
  }

  function handleBlur() {
    const parsed = parseTimeInput(inputText);
    if (parsed) {
      setInputText(parsed);
      onChange(parsed);
      return;
    }
    if (value) {
      setInputText(value);
    }
  }

  function handleSelectQuick(timeStr: string) {
    onChange(timeStr);
    setInputText(timeStr);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? "z-50" : "z-20"} ${className}`}
    >
      {label && (
        <div className="mb-1.5 flex h-4 items-center justify-between">
          <label className="text-xs font-bold text-fg">{label}</label>
          {value ? (
            <span className="font-mono text-[11px] font-extrabold text-brand-orange truncate max-w-[55%] text-right">
              {value.replace(":", "h")}
            </span>
          ) : null}
        </div>
      )}

      {/* Input hidden pour envoi de formulaire natif */}
      <input type="hidden" name={name} value={value} />

      {/* Zone de saisie combinée : Input direct + Bouton Sélecteur d'heures parfaitement aligné */}
      <div
        className={`flex h-12 w-full items-stretch rounded-xl border bg-[#141d24] overflow-hidden transition-all ${
          open
            ? "border-brand-orange ring-2 ring-brand-orange/20 shadow-lg shadow-brand-orange/10"
            : "border-white/10 hover:border-white/20 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-1 items-center min-w-0 pl-3.5 pr-2">
          <span className="text-base text-fg/60 select-none shrink-0 mr-2">🕒</span>
          <input
            type="text"
            disabled={disabled}
            value={inputText}
            onChange={(e) => handleManualTime(e.target.value)}
            onBlur={handleBlur}
            placeholder="HH:MM"
            className="h-full w-full bg-transparent font-mono text-sm font-bold text-white placeholder:text-fg/30 outline-none"
          />
        </div>

        {/* Bouton d'ouverture du sélecteur d'heures (carré 48x48px aligné) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Fermer les horaires" : "Choisir l'heure"}
          title={open ? "Fermer les horaires" : "Choisir l'heure"}
          className={`flex h-full w-12 shrink-0 items-center justify-center border-l border-white/10 transition-colors ${
            open
              ? "bg-brand-orange/20 text-brand-orange"
              : "bg-white/[0.03] text-fg/70 hover:bg-white/[0.08] hover:text-brand-orange"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>

      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

      {/* Popover Sélecteur d'Heures Sombre */}
      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full z-[100] mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/20 bg-[#141d24] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-fg/70">Choisir l&apos;heure</span>
            {isToday ? (
              <button
                type="button"
                onClick={() => {
                  const nowStr = `${pad(nowHour)}:${pad(nowMinute)}`;
                  handleSelectQuick(nowStr);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-orange hover:bg-brand-orange/25"
              >
                <SparklesIcon className="h-3 w-3" />
                <span>Maintenant</span>
              </button>
            ) : null}
          </div>

          {/* Créneaux fréquents */}
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
                    onClick={() => handleSelectQuick(t)}
                    className={`rounded-lg py-1.5 font-mono text-xs font-bold transition-all ${
                      disabledChip
                        ? "opacity-20 cursor-not-allowed bg-surface-sunken text-fg/30"
                        : isSelected
                          ? "bg-brand-orange text-ink font-black shadow-sm"
                          : "bg-surface-sunken text-fg/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélecteur précis Heures & Minutes */}
          <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
            {/* Colonne Heures */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg/40 mb-1">Heure</p>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-white/5 bg-surface-sunken/60 p-1 space-y-1 scrollbar-thin">
                {Array.from({ length: 24 }).map((_, i) => {
                  const hourStr = pad(i);
                  const isPast = !allowPastTimes && isToday && i < nowHour;
                  const isSelected = currentHourVal === hourStr;
                  return (
                    <button
                      key={hourStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        const newTime = `${hourStr}:${currentMinuteVal}`;
                        onChange(newTime);
                        setInputText(newTime);
                      }}
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

            {/* Colonne Minutes */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-fg/40 mb-1">Minute</p>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-white/5 bg-surface-sunken/60 p-1 space-y-1 scrollbar-thin">
                {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((minStr) => {
                  const isPast = !allowPastTimes && isToday && Number(currentHourVal) === nowHour && Number(minStr) < nowMinute;
                  const isSelected = currentMinuteVal === minStr;
                  return (
                    <button
                      key={minStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        const newTime = `${currentHourVal}:${minStr}`;
                        onChange(newTime);
                        setInputText(newTime);
                      }}
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
