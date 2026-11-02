import Link from "next/link";
import type { ReactNode } from "react";
import { BuildingIcon, ChevronIcon } from "./settings-icons";
import { SettingsPageHeader } from "./settings-ui";
import { visibleGroups } from "./settings-nav-config";
import { buildSetupSteps } from "./settings-setup";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { listProperties } from "@/lib/properties-data";
import { listExpenseCategoriesForSettings } from "@/lib/expense-categories-data";
import { listUsers } from "@/lib/users-data";
import { listBankAccounts, listTransferSchedules } from "@/lib/bank-data";
import { getTheme } from "@/lib/theme";
import { resolveImageDisplayUrl } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

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
  const t = await getT();
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
    "/settings/documents": "Présentations des contrats, quittances et tickets de caisse",
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
  const setup = buildSetupSteps({
    establishmentName: settings?.establishmentName,
    hasLogo: Boolean(settings?.logoUrl),
    propertiesCount: propertiesTotal,
    expenseCategoriesCount: expenseCategories.length,
    isAdmin,
  });

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
          <p className="truncate text-base font-bold text-fg">{settings?.establishmentName || <T>{"Établissement non renseigné"}</T>}</p>
          <p className="mt-0.5 truncate text-sm text-fg/55">{contact || <T>{"Ajoutez vos coordonnées pour les contrats et les messages."}</T>}</p>
        </div>
        <Link
          href="/settings/etablissement"
          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-brand-orange sm:w-auto"
        >
          <T>Modifier</T>
        </Link>
      </section>

      {setup.complete ? null : (
        <section aria-labelledby="setup-title" className="mb-8 rounded-2xl border border-border/15 bg-surface-raised p-4 shadow-card sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="setup-title" className="text-base font-bold text-fg">
              <T>À finaliser</T>
            </h2>
            <p className="text-sm font-semibold text-fg/55">
              {setup.done} sur {setup.total} <T>terminées</T>
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={t("Avancement de la configuration")}
            aria-valuemin={0}
            aria-valuemax={setup.total}
            aria-valuenow={setup.done}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10"
          >
            <div className="h-full rounded-full bg-brand-orange" style={{ width: `${(setup.done / setup.total) * 100}%` }} />
          </div>
          <ul className="mt-2 divide-y divide-border/10">
            {setup.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${
                    step.done ? "border-success bg-success-bg text-success" : "border-border/30 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${step.done ? "text-fg/50 line-through" : "text-fg"}`}>
                    <T>{step.label}</T>
                    <span className="sr-only">{step.done ? <T>{" : terminé"}</T> : <T>{" : à faire"}</T>}</span>
                  </span>
                  {step.done ? null : <span className="block text-xs text-fg/55"><T>{step.hint}</T></span>}
                </span>
                {step.done ? null : (
                  <Link
                    href={step.href}
                    className="inline-flex h-11 shrink-0 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                  >
                    {step.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:items-start lg:gap-x-5">
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
                <T>{group.title}</T>
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
                        <span className="block truncate text-sm font-bold text-fg"><T>{row.title}</T></span>
                        <span className="block text-xs text-fg/55"><T>{row.description}</T></span>
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
