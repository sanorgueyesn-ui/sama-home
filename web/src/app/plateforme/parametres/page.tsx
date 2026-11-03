import { getEnvironmentLabel, type EnvironmentKind } from "@/lib/environment-label";
import { getCurrentUser, requirePlatformPermission } from "@/lib/dal";
import { roleLabel } from "@/lib/platform-access";
import { TRIAL_DURATION_MONTHS } from "@/lib/registration-policy";
import { CheckCircleIcon, LockIcon, ShieldIcon } from "@/components/ui/icons";
import { AdminPasswordForm } from "./admin-password-form";

const ENVIRONMENT_STYLES: Record<EnvironmentKind, { badge: string; dot: string }> = {
  production: { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  local: { badge: "border-amber-500/40 bg-amber-500/10 text-amber-300", dot: "bg-amber-300" },
  inconsistent: { badge: "border-red-500/40 bg-red-500/10 text-red-300", dot: "bg-red-400" },
  unknown: { badge: "border-red-500/40 bg-red-500/10 text-red-300", dot: "bg-red-400" },
};

function Card({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3 border-b border-white/10 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-black text-white sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/5 px-3.5 py-3">
      <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/55">{value}</p>
      </div>
    </div>
  );
}

export default async function PlatformSettingsPage() {
  await requirePlatformPermission("PLATFORM_SETTINGS");
  const environment = getEnvironmentLabel(process.env);
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Réglages</h1>
          <p className="mt-1 text-xs font-medium text-white/50 sm:text-sm">Règles d&apos;inscription et sécurité de votre compte.</p>
        </div>
        {/* Environnement déclaré par la configuration serveur (aucune valeur de configuration affichée). */}
        <span
          title={environment.hint}
          data-environment={environment.kind}
          className={`flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-[11px] font-bold sm:self-auto ${ENVIRONMENT_STYLES[environment.kind].badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ENVIRONMENT_STYLES[environment.kind].dot}`} />
          {environment.label}
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <Card title="Inscriptions et abonnements" subtitle="Règles appliquées automatiquement à chaque nouvel établissement." icon={<ShieldIcon className="h-5 w-5" aria-hidden />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Rule label="Activation immédiate" value="Un nouvel établissement est activé dès son inscription, sans attendre votre approbation. Vous pouvez le suspendre ensuite en cas d'abus." />
            <Rule label={`Essai gratuit de ${TRIAL_DURATION_MONTHS} mois`} value="Toutes les fonctions sont ouvertes pendant l'essai, puis l'abonnement se règle en ligne." />
            <Rule label="Paiement en ligne" value="Wave, Orange Money et carte via PayDunya. L'abonnement est prolongé dès que le paiement est confirmé." />
            <Rule label="Abonnement expiré" value="Les données sont conservées et restent consultables. Les nouvelles créations sont bloquées jusqu'au renouvellement." />
          </div>
        </Card>

        <Card title="Sécurité du compte" subtitle={`Connecté en tant que ${user.username} · ${roleLabel(user.permissions)}`} icon={<LockIcon className="h-5 w-5" aria-hidden />}>
          <AdminPasswordForm currentUsername={user.username} currentName={user.name} />
        </Card>
      </div>
    </div>
  );
}
