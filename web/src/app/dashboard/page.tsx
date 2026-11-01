import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardResidenceView } from "@/components/dashboard/dashboard-residence-view";
import { DashboardHotelView } from "@/components/dashboard/dashboard-hotel-view";
import { DashboardAgencyView } from "@/components/dashboard/dashboard-agency-view";
import { MODE_THEME } from "@/components/dashboard/dashboard-ui";
import { getCurrentUser } from "@/lib/dal";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { listMySpaces } from "@/lib/spaces-data";
import { toShellMode, type ShellMode } from "@/lib/business-mode";

export const metadata = { title: "Tableau de bord — SAMA HOME" };

const MODES: ShellMode[] = ["RESIDENCE", "HOTEL", "AGENCY"];
const MODE_SHORT_LABEL: Record<ShellMode, string> = { RESIDENCE: "Résidence", HOTEL: "Hôtel", AGENCY: "Agence" };

function parseMode(raw: string | undefined): ShellMode | null {
  const value = (raw ?? "").toUpperCase();
  if (value === "RESIDENCE" || value === "HOTEL") return value;
  if (value === "AGENCY" || value === "IMMOBILIER") return "AGENCY";
  return null;
}

/**
 * Tableau de bord : un par mode métier, chacun avec les données réelles de l'espace actif. Le mode
 * est celui de l'espace (`Establishment.businessMode`). `?mode=` ne sert qu'à comparer les trois
 * présentations en développement local ; en production il est ignoré.
 */
export default async function DashboardPage(props: { searchParams?: Promise<{ mode?: string }> }) {
  // Impose la session et, pour un compte à plusieurs espaces, le choix préalable de l'espace.
  const user = await getCurrentUser();
  if (!user.establishmentId) redirect(user.isPlatformAdmin ? "/plateforme" : "/login");

  const spaces = await listMySpaces(user.id);
  const activeSpace = spaces.find((space) => space.id === user.establishmentId);
  const spaceMode: ShellMode = activeSpace ? toShellMode(activeSpace.businessMode) : "RESIDENCE";

  const isPreviewAllowed = process.env.NODE_ENV === "development";
  const searchParams = await props.searchParams;
  const mode = (isPreviewAllowed ? parseMode(searchParams?.mode) : null) ?? spaceMode;

  const overview = await getDashboardOverview();

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-app-page lg:min-h-[calc(100dvh-60px)] px-4 pb-10 pt-4 font-sans text-app-text sm:px-6 sm:pt-5 lg:px-8 lg:pt-7">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-5 lg:gap-6">
        {isPreviewAllowed ? (
          <nav aria-label="Aperçu des modes (développement local)" className="flex items-center gap-3">
            <span className="hidden whitespace-nowrap text-xs font-semibold text-app-faint lg:inline">Aperçu développement</span>
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-app-line bg-app-panel-2 p-1 lg:w-auto">
              {MODES.map((item) => (
                <Link
                  key={item}
                  href={`/dashboard?mode=${item}`}
                  aria-current={item === mode ? "page" : undefined}
                  className={`flex min-h-9 items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-app-focus ${
                    item === mode ? MODE_THEME[item].primary : "text-app-muted hover:bg-fg/5 hover:text-app-text"
                  }`}
                >
                  {MODE_SHORT_LABEL[item]}
                </Link>
              ))}
            </div>
            <span className="ms-auto hidden whitespace-nowrap text-xs text-app-faint lg:inline">Espace réel : {MODE_THEME[spaceMode].label}</span>
          </nav>
        ) : null}

        {mode === "HOTEL" ? (
          <DashboardHotelView overview={overview} />
        ) : mode === "AGENCY" ? (
          <DashboardAgencyView overview={overview} />
        ) : (
          <DashboardResidenceView overview={overview} />
        )}
      </div>
    </div>
  );
}
