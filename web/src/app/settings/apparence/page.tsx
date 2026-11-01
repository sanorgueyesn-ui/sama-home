import { SettingsPageHeader, SettingsSection } from "../settings-ui";
import { ThemeSection } from "../theme-section";
import { AppearanceEditor } from "../appearance-editor";
import { getSettings } from "@/lib/settings-data";
import { getTheme } from "@/lib/theme";
import { getCurrentUser } from "@/lib/dal";
import { resolveBrandColors } from "@/lib/brand-colors";

export const metadata = { title: "Apparence — SAMA HOME" };

export default async function AppearanceSettingsPage() {
  const user = await getCurrentUser();
  const [settings, theme] = await Promise.all([getSettings(), getTheme()]);

  return (
    <>
      <SettingsPageHeader title="Apparence" description="Le thème de l'application et la palette de couleurs de votre établissement." />
      <div className="flex flex-col gap-5">
        <SettingsSection title="Thème" description="Sombre ou clair, sur cet appareil. Le choix est conservé après déconnexion.">
          <ThemeSection current={theme} />
        </SettingsSection>
        {user.role === "ADMIN" ? (
          <AppearanceEditor currentColors={resolveBrandColors(settings)} theme={theme} canSave={Boolean(settings)} />
        ) : (
          <SettingsSection title="Palette de couleurs" description="Seul un administrateur peut modifier les couleurs de l'établissement." >
            <p className="text-sm text-fg/60">Contactez l&apos;administrateur de votre établissement pour changer la palette.</p>
          </SettingsSection>
        )}
      </div>
    </>
  );
}
