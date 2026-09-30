"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-navy">
      <div className="relative flex flex-1 flex-col items-center justify-end overflow-hidden px-6 pt-16 pb-10 sm:justify-center sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1C2C] via-navy to-[#1A3F5C]"
        />
        <div className="relative flex flex-col items-center text-center">
          <div className="h-20 w-20 overflow-hidden rounded-2xl shadow-lg sm:h-24 sm:w-24">
            <Image
              src="/brand/Sama-Home-icone-Blanc-cassé.png"
              alt="SAMA HOME"
              width={96}
              height={96}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-wide text-white">
            SAMA HOME
          </h1>
          <p className="mt-1 text-sm font-medium text-white/80">
            Gestion simple de vos logements
          </p>
        </div>
      </div>

      <div className="rounded-t-3xl bg-white px-6 pt-7 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] sm:mx-auto sm:mb-16 sm:w-full sm:max-w-sm sm:rounded-3xl">
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-bold text-navy"
            >
              Identifiant
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold text-navy"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 pr-11 text-sm text-navy outline-none focus:border-navy"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
              className="absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center text-navy/50"
            >
              {showPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c5.6 0 9.7 4 11 7-0.5 1.1-1.4 2.5-2.7 3.8M6.6 6.6C4.3 8 2.6 10 1 12c1.6 3.3 5.9 7 11 7 1.6 0 3.1-0.3 4.4-0.9" />
                  <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="h-4 w-4 accent-navy"
              />
              Se souvenir de moi
            </label>
            <Link href="#" className="text-xs font-semibold text-coral">
              Mot de passe oublié ?
            </Link>
          </div>

          {state?.error && (
            <p
              role="alert"
              className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white transition-opacity disabled:opacity-60"
          >
            {pending ? "Connexion..." : "SE CONNECTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
