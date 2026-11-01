import { SettingsNotice, SettingsPageHeader, SettingsSection } from "../settings-ui";
import { getCurrentUser } from "@/lib/dal";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Mon compte — SAMA HOME" };

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire" };

export default async function ChangePasswordPage(props: { searchParams: Promise<{ passwordChanged?: string }> }) {
  const { passwordChanged } = await props.searchParams;
  const user = await getCurrentUser();

  return (
    <>
      <SettingsPageHeader title="Mon compte" description="Vos informations de connexion et votre mot de passe." />
      {passwordChanged ? <SettingsNotice>Mot de passe modifié.</SettingsNotice> : null}
      <div className="flex flex-col gap-5">
        <SettingsSection title="Informations">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg/45">Nom</dt>
              <dd className="mt-1 text-sm font-semibold text-fg">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg/45">Identifiant</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-fg">{user.username}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-fg/45">Rôle</dt>
              <dd className="mt-1 text-sm font-semibold text-fg">{(user.role && ROLE_LABELS[user.role]) || "Plateforme"}</dd>
            </div>
          </dl>
        </SettingsSection>
        <SettingsSection title="Modifier mon mot de passe" description="Saisissez votre mot de passe actuel, puis le nouveau.">
          <ChangePasswordForm />
        </SettingsSection>
      </div>
    </>
  );
}
