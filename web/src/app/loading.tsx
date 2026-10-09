function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      {/* En-tête : titre + date (toutes largeurs), CTA desktop uniquement —
          même structure que page.tsx, pour éviter un décalage visuel au
          chargement réel. */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="mt-2 h-4 w-32" />
        </div>
        <div className="hidden lg:flex lg:gap-2">
          <SkeletonBlock className="h-10 w-44" />
          <SkeletonBlock className="h-10 w-48" />
        </div>
      </div>

      {/* Recettes du jour (carte mise en avant, mobile uniquement — maquette
          réelle) + indicateurs : 4 colonnes mobile/tablette, 5 colonnes
          desktop, mêmes paliers que la grille réelle de page.tsx. */}
      <SkeletonBlock className="mt-5 h-20 w-full md:hidden" />
      <div className="mt-3 grid grid-cols-4 gap-2.5 md:mt-5 lg:grid-cols-5 lg:gap-3">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="hidden h-20 w-full lg:block" />
      </div>

      {/* Mes biens : titre + filtres + grille (1 colonne mobile, 2 tablette,
          4 desktop) + colonne latérale desktop (Planning/Dépenses/Accès
          rapide), même répartition que page.tsx/my-properties.tsx. */}
      <div className="mt-5 flex items-center justify-between">
        <SkeletonBlock className="h-5 w-28" />
        <SkeletonBlock className="h-4 w-14" />
      </div>
      <SkeletonBlock className="mt-2.5 h-8 w-full sm:w-72" />

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonBlock className="h-56 w-full" />
          <SkeletonBlock className="h-56 w-full" />
          <SkeletonBlock className="h-56 w-full" />
          <SkeletonBlock className="h-56 w-full" />
        </div>

        <div className="mt-5 hidden lg:mt-0 lg:flex lg:flex-col lg:gap-5">
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
