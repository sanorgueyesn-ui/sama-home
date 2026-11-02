
import { getT } from "@/lib/i18n/server";function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-fg/8 ${className}`} />;
}

// Affiché dans le cadre commun des paramètres (layout.tsx) : seulement le contenu de la page.
export default async function SettingsLoading() {
  const t = await getT();
  return (
    <div role="status" aria-label={t("Chargement des paramètres")}>
      <SkeletonBlock className="h-8 w-44" />
      <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-8 flex flex-col gap-3">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
    </div>
  );
}
