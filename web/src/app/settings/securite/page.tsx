import Link from "next/link";
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

  return (
    <>
      <SettingsPageHeader title="Sécurité" description="Protégez l'accès à votre établissement quand un poste reste sans surveillance." />
      <SettingsSection
        title="Déconnexion automatique"
        description="Après ce temps sans activité, la session se ferme : au retour, l'identifiant et le mot de passe sont redemandés. Le réglage vaut pour tous les comptes de l'établissement."
      >
        {settings ? (
          <>
            <SessionIdleForm current={normalizeIdleMinutes(settings.sessionIdleMinutes)} />
            <p className="mt-4 text-xs text-fg/55">
              <T>Une session ne dépasse jamais 12 heures, même avec une activité continue.</T>
            </p>
          </>
        ) : (
          // Le réglage est enregistré avec les informations de l'établissement : elles doivent exister d'abord.
          <div role="status" className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-app-warn">
            <p>
              <T>Renseignez d&apos;abord le nom, le téléphone et l&apos;adresse de votre établissement : le réglage s&apos;enregistre avec ces informations.</T>
            </p>
            <Link href="/settings/etablissement" className="mt-2 inline-flex font-bold underline underline-offset-4">
              <T>Renseigner mon établissement</T>
            </Link>
          </div>
        )}
      </SettingsSection>
    </>
  );
}
