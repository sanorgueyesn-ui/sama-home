import { redirect } from "next/navigation";
import { SettingsPageHeader, SettingsSection } from "../settings-ui";
import { SessionIdleForm } from "./session-idle-form";
import { requireAdmin } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { normalizeIdleMinutes } from "@/lib/session-policy";
import { T } from "@/components/i18n/i18n-provider";

export const metadata = { title: "Sécurité — SAMA HOME" };

/** Sécurité de l'établissement : déconnexion automatique après inactivité (administrateur uniquement). */
export default async function SecuritySettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  // Les paramètres de l'établissement (nom, téléphone, adresse) doivent exister avant tout réglage.
  if (!settings) redirect("/settings/etablissement");

  return (
    <>
      <SettingsPageHeader title="Sécurité" description="Protégez l'accès à votre établissement quand un poste reste sans surveillance." />
      <SettingsSection
        title="Déconnexion automatique"
        description="Après ce temps sans activité, la session se ferme : au retour, l'identifiant et le mot de passe sont redemandés. Le réglage vaut pour tous les comptes de l'établissement."
      >
        <SessionIdleForm current={normalizeIdleMinutes(settings.sessionIdleMinutes)} />
        <p className="mt-4 text-xs text-fg/55">
          <T>Une session ne dépasse jamais 12 heures, même avec une activité continue.</T>
        </p>
      </SettingsSection>
    </>
  );
}
