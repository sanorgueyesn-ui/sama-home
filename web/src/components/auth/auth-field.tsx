"use client";

import { useState, type ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3.5" width="9" height="17" rx="1" />
      <path d="M14 9.5h4.5a1 1 0 0 1 1 1V20H14" />
      <path d="M8 7.5h1.2M8 11h1.2M8 14.5h1.2" />
    </svg>
  ),
  person: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M7.5 10.5v-3a4.5 4.5 0 0 1 9 0v3" />
    </svg>
  ),
};

export type AuthFieldIcon = keyof typeof ICONS;

export function AuthField({
  id,
  name,
  label,
  icon,
  type = "text",
  hint,
  required,
  autoComplete,
  disabled,
  errors,
  passwordToggle,
}: {
  id: string;
  name?: string;
  label: string;
  icon: AuthFieldIcon;
  type?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  errors?: string[];
  passwordToggle?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = passwordToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg/40">
          {ICONS[icon]}
        </span>
        <input
          id={id}
          name={name ?? id}
          type={resolvedType}
          placeholder={label}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={`h-12 w-full rounded-xl border border-border/15 bg-surface pl-10 text-sm font-medium text-fg outline-none placeholder:text-fg/50 focus:border-navy focus-visible:ring-2 focus-visible:ring-navy disabled:opacity-60 ${
            passwordToggle ? "pr-11" : "pr-4"
          }`}
        />
        {passwordToggle ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg/50 focus-visible:ring-2 focus-visible:ring-navy"
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l18 18" />
                <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c5.6 0 9.7 4 11 7-0.5 1.1-1.4 2.5-2.7 3.8M6.6 6.6C4.3 8 2.6 10 1 12c1.6 3.3 5.9 7 11 7 1.6 0 3.1-0.3 4.4-0.9" />
                <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1 pl-1 text-[11px] font-medium text-fg/40">{hint}</p> : null}
      {errors?.map((error) => (
        <p key={error} className="mt-1 pl-1 text-xs font-medium text-danger">
          {error}
        </p>
      ))}
    </div>
  );
}
