import Image from "next/image";
import { SettingsForm } from "../settings-form";
import { SettingsNotice, SettingsPageHeader, SettingsSection } from "../settings-ui";
import { getSettings } from "@/lib/settings-data";
import { resolveImageDisplayUrl } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";
import { getCurrentUser } from "@/lib/dal";
import { getGuestInfoContext } from "@/lib/guest-info-data";

export const metadata = { title: "Établissement — SAMA HOME" };

export default async function EstablishmentSettingsPage(props: { searchParams: Promise<{ saved?: string; contrat?: string }> }) {
  const { saved, contrat } = await props.searchParams;
  await getCurrentUser();
  const [settings, guest] = await Promise.all([getSettings(), getGuestInfoContext()]);
  // `settings.logoUrl` est la clé brute stockée (ou un lien hérité) : résolue ici en URL
  // d'affichage avant d'être transmise au formulaire (voir src/lib/object-storage.ts).
  const logoDisplayUrl = settings?.logoUrl
    ? await resolveImageDisplayUrl(getS3Client(), getBucketName(), settings.logoUrl)
    : null;

  return (
    <>
      <SettingsPageHeader title="Établissement" description="Les informations affichées sur vos contrats et vos documents." />
      {saved ? <SettingsNotice>Modifications enregistrées.</SettingsNotice> : null}
      {contrat === "incomplet" ? (
        <p role="status" className="mb-5 rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-app-warn">
          Pour générer le contrat, renseignez d&apos;abord le nom, le téléphone et l&apos;adresse de votre établissement : ils y figurent comme coordonnées du bailleur.
        </p>
      ) : null}
      {/* `key` : après un enregistrement, le formulaire repart des nouvelles valeurs (état « modifié » remis à zéro). */}
      <SettingsForm key={settings?.updatedAt.toISOString() ?? "nouveau"} defaultValues={settings ? { ...settings, logoUrl: logoDisplayUrl } : undefined} guestInfo={guest.enabled ? guest.settings : null} />
      <SettingsSection title="Logo SAMA HOME" description="Le logo de la plateforme ne se modifie pas ; il s'ajoute à côté de celui de votre établissement." className="mt-5">
        <div className="flex items-center gap-4">
          <Image src="/brand/Sama-Home-icone-Bleu-nuit.png" alt="SAMA HOME" width={48} height={48} className="rounded-lg" />
          <p className="text-sm text-fg/60">Logo officiel SAMA HOME, non modifiable depuis cette page.</p>
        </div>
      </SettingsSection>
    </>
  );
}
