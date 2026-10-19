import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/10 text-navy">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>
      <h1 className="text-2xl font-extrabold text-navy">404 — Page introuvable</h1>
      <p className="mt-2 max-w-xs text-sm text-fg/70">
        La page demandée n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-navy px-6 text-sm font-bold text-white shadow-sm hover:bg-navy/90 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-fg hover:bg-muted transition-colors"
        >
          Accéder à l&apos;application
        </Link>
      </div>
    </div>
  );
}
