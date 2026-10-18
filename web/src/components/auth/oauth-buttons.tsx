/**
 * Bouton de connexion rapide avec Google.
 * Le bouton Apple est masqué sur demande de l'administrateur.
 * Redirige vers /api/auth/google pour initialiser le flux OAuth 2.0 sécurisé.
 */
export function OAuthButtons() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/15" aria-hidden />
        <span className="text-[11px] font-bold tracking-wide text-fg/40 uppercase">
          ou continuer avec
        </span>
        <div className="h-px flex-1 bg-border/15" aria-hidden />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <a
          href="/api/auth/google"
          className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border/20 bg-surface-raised px-4 text-xs font-bold text-fg transition-all hover:border-brand-orange/60 hover:bg-white/5 hover:shadow-sm active:scale-[0.99] sm:text-sm"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden className="shrink-0 transition-transform group-hover:scale-105">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
            <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.7 26.8 36 24 36c-5.3 0-9.6-3.1-11.3-7.5l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.5 5.5C40.5 36.5 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          <span className="font-extrabold tracking-wide">Se connecter avec Google</span>
        </a>
      </div>
    </div>
  );
}
