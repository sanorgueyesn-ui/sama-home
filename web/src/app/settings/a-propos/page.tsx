import { SettingsPageHeader, SettingsSection } from "../settings-ui";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";
import { getCurrentUser } from "@/lib/dal";

export const metadata = { title: "À propos — SAMA HOME" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/10 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-xs font-bold uppercase tracking-wide text-fg/45">{label}</dt>
      <dd className="text-sm font-semibold text-fg sm:text-right">{value}</dd>
    </div>
  );
}

export default async function AboutSettingsPage() {
  await getCurrentUser();
  return (
    <>
      <SettingsPageHeader title="À propos" description="Version de l'application, éditeur et assistance." />
      <div className="flex flex-col gap-5">
        <SettingsSection title="Application">
          <dl>
            <Row label="Application" value="SAMA HOME" />
            <Row label="Version" value="0.1.0" />
          </dl>
        </SettingsSection>
        <SettingsSection title="Éditeur et assistance">
          <dl>
            <Row label="Éditeur" value={`${COMPANY_LEGAL_INFO.commercialName} (${COMPANY_LEGAL_INFO.sigle})`} />
            <Row label="N.I.N.E.A" value={COMPANY_LEGAL_INFO.ninea} />
            <Row label="R.C.C.M" value={COMPANY_LEGAL_INFO.rccm} />
            <Row label="Siège" value={COMPANY_LEGAL_INFO.address} />
            <Row label="Assistance" value={COMPANY_LEGAL_INFO.formattedPhone} />
          </dl>
        </SettingsSection>
      </div>
    </>
  );
}
