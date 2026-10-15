/**
 * Boutons Google/Apple — apparence conforme à la maquette, mais
 * VOLONTAIREMENT désactivés : aucun fournisseur OAuth n'est configuré dans
 * ce projet (aucune dépendance, aucune variable d'environnement). Jamais une
 * simulation de connexion réussie. Empilés sur mobile, côte à côte dès `sm:`
 * (tablette et plus), conformément à la référence.
 */
export function OAuthButtons() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/15" aria-hidden />
        <span className="text-[11px] font-bold tracking-wide text-fg/40">ou continuer avec</span>
        <div className="h-px flex-1 bg-border/15" aria-hidden />
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-describedby="oauth-unavailable"
          className="flex h-12 w-full flex-1 items-center justify-center gap-2 rounded-xl border border-border/15 bg-surface-raised px-2 text-xs font-bold whitespace-nowrap text-fg/50 sm:w-auto sm:text-[13px]"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden className="shrink-0">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
            <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.7 26.8 36 24 36c-5.3 0-9.6-3.1-11.3-7.5l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.5 5.5C40.5 36.5 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          <span>Continuer avec Google</span>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-describedby="oauth-unavailable"
          className="flex h-12 w-full flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-2 text-xs font-bold whitespace-nowrap text-white opacity-50 sm:w-auto sm:text-[13px]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
            <path d="M16.5 1.5c.1 1.1-.3 2.2-1 3-.8.9-2 1.6-3.1 1.5-.1-1.1.4-2.2 1.1-3C14.3 2.1 15.5 1.5 16.5 1.5zM20.7 17.3c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.4.9-3.7.9c-1.6 0-2.8-1.6-3.7-2.9C2 17.4 1.4 13.1 3 10.5c1.1-1.8 2.9-2.9 4.6-2.9 1.5 0 2.5 1 3.7 1 1.2 0 2-1 3.7-1 1.4 0 2.9.8 3.9 2.1-3.5 1.9-2.9 6.9 1.8 7.6z" />
          </svg>
          <span>Continuer avec Apple</span>
        </button>
      </div>
      <p id="oauth-unavailable" className="mt-2 text-center text-[11px] font-medium text-fg/40">
        Connexion Google et Apple — bientôt disponible.
      </p>
    </div>
  );
}
