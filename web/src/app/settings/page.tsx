import Link from "next/link";
import type { ReactNode } from "react";
import { BuildingIcon, ChevronIcon } from "./settings-icons";
import { SettingsPageHeader } from "./settings-ui";
import { visibleGroups } from "./settings-nav-config";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { listProperties } from "@/lib/properties-data";
import { listExpenseCategoriesForSettings } from "@/lib/expense-categories-data";
import { listUsers } from "@/lib/users-data";
import { listBankAccounts, listTransferSchedules } from "@/lib/bank-data";
import { getTheme } from "@/lib/theme";
import { resolveImageDisplayUrl } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";

export const metadata = { title: "Paramètres — SAMA HOME" };

type HubRow = { href: string; title: string; description: string; icon: ReactNode };

function plural(n: number, singular: string, pluralForm: string) {
  return n <= 1 ? singular : pluralForm;
}

/**
 * Vue d'ensemble des paramètres : l'état de chaque section en un coup d'œil, et un accès direct.
 * Sur téléphone, c'est le point d'entrée (une liste de sections) ; sur ordinateur, le menu latéral
 * offre les mêmes accès en permanence. Uniquement des chiffres réels, lus par les fonctions
 * existantes ; les listes réservées à l'administrateur ne sont chargées que pour lui.
 */
export default async function SettingsPage() {
  const [user, settings, theme] = await Promise.all([getCurrentUser(), getSettings(), getTheme()]);
  const isAdmin = user.role === "ADMIN";

  const logoDisplayUrl = settings?.logoUrl
    ? await resolveImageDisplayUrl(getS3Client(), getBucketName(), settings.logoUrl)
    : null;

  const [{ total: propertiesTotal }, expenseCategories, adminLists] = await Promise.all([
    listProperties(),
    listExpenseCategoriesForSettings(),
    isAdmin ? Promise.all([listUsers(), listBankAccounts(), listTransferSchedules()]) : Promise.resolve(null),
  ]);
  const [users, bankAccounts, transferSchedules] = adminLists ?? [[], [], []];
  const activeBankAccounts = bankAccounts.filter((a) => a.active).length;
  const activeSchedules = transferSchedules.filter((s) => s.active).length;

  const descriptions: Record<string, string> = {
    "/settings/etablissement": settings?.establishmentName || "À renseigner : nom, téléphone, adresse",
    "/settings/apparence": `Thème ${theme === "dark" ? "sombre" : "clair"} et couleurs de l'établissement`,
    "/settings/expense-categories": `${expenseCategories.length} ${plural(expenseCategories.length, "catégorie", "catégories")}`,
    "/settings/users": `${users.length} ${plural(users.length, "utilisateur", "utilisateurs")}`,
    "/settings/bank-accounts":
      bankAccounts.length === 0 ? "Aucun compte bancaire" : `${activeBankAccounts} actif(s) sur ${bankAccounts.length}`,
    "/settings/transfer-schedules":
      transferSchedules.length === 0
        ? "Aucune programmation"
        : `${activeSchedules} ${plural(activeSchedules, "programmation active", "programmations actives")}`,
    "/settings/password": "Modifier votre mot de passe de connexion",
    "/settings/a-propos": "Version, éditeur et assistance",
  };

  const initial = (settings?.establishmentName || "S").trim().charAt(0).toUpperCase();
  const contact = [settings?.phone, settings?.address, settings?.email].filter(Boolean).join(" · ");

  return (
    <>
      <SettingsPageHeader title="Paramètres" description="Configurez votre établissement, votre équipe et vos finances." hideBack />

      <section className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-border/15 bg-surface-raised p-4 shadow-card sm:p-5">
        {logoDisplayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDisplayUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border/15 bg-surface-sunken object-contain p-1.5" />
        ) : (
          <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-xl font-extrabold text-brand-orange">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate text-base font-bold text-fg">{settings?.establishmentName || "Établissement non renseigné"}</p>
          <p className="mt-0.5 truncate text-sm text-fg/55">{contact || "Ajoutez vos coordonnées pour les contrats et les messages."}</p>
        </div>
        <Link
          href="/settings/etablissement"
          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-brand-orange sm:w-auto"
        >
          Modifier
        </Link>
      </section>

      <div className="flex flex-col gap-7">
        {visibleGroups(isAdmin).map((group) => {
          // « Vue d'ensemble » est cette page et « Établissement » a sa fiche en haut : jamais en double.
          const rows: HubRow[] = group.items
            .filter((item) => item.href !== "/settings" && item.href !== "/settings/etablissement")
            .map((item) => {
              const Icon = item.icon;
              return { href: item.href, title: item.label, description: descriptions[item.href] ?? "", icon: <Icon /> };
            });
          if (group.title === "Activité") {
            rows.unshift({
              href: "/logements",
              title: "Logements et tarifs",
              description: `${propertiesTotal} ${plural(propertiesTotal, "logement", "logements")}, tarifs gérés depuis chaque logement`,
              icon: <BuildingIcon />,
            });
          }
          if (rows.length === 0) return null;
          return (
            <section key={group.title} aria-labelledby={`grp-${group.title}`}>
              <h2 id={`grp-${group.title}`} className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-fg/45">
                {group.title}
              </h2>
              <ul className="divide-y divide-border/10 overflow-hidden rounded-2xl border border-border/15 bg-surface-raised shadow-card">
                {rows.map((row) => (
                  <li key={row.href}>
                    <Link
                      href={row.href}
                      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-fg/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-brand-orange">{row.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-fg">{row.title}</span>
                        <span className="block truncate text-xs text-fg/55">{row.description}</span>
                      </span>
                      <span className="shrink-0 text-fg/30">
                        <ChevronIcon />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
