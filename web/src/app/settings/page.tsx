import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import {
  SettingsCard,
  DomainIcon,
  BuildingIcon,
  TagIcon,
  ReceiptIcon,
  PeopleIcon,
  WalletIcon,
  TransferIcon,
} from "./settings-card";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";
import { listProperties } from "@/lib/properties-data";
import { listExpenseCategoriesForSettings } from "@/lib/expense-categories-data";
import { listUsers } from "@/lib/users-data";
import { listBankAccounts, listTransferSchedules } from "@/lib/bank-data";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/10 py-3 last:border-0">
      <span className="text-[11px] font-bold text-fg/50">{label}</span>
      <span className="text-sm font-semibold text-fg">{value}</span>
    </div>
  );
}

function plural(n: number, singular: string, plural: string) {
  return n <= 1 ? singular : plural;
}

export default async function SettingsPage(props: PageProps<"/settings">) {
  const { saved, passwordChanged } = await props.searchParams;
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const isAdmin = user.role === "ADMIN";

  // Bloc Lot Paramètres 2 — uniquement des données déjà chargées par les
  // mécanismes existants (mêmes fonctions gelées que les pages CRUD
  // elles-mêmes), jamais de nombre inventé. Les 3 listes ADMIN ne sont
  // chargées que pour un ADMIN — un GESTIONNAIRE ne doit jamais recevoir,
  // même visuellement, une promesse d'accès à une donnée qu'il ne peut pas
  // charger (requireAdmin() reste la seule protection réelle, inchangée).
  const [{ total: propertiesTotal }, expenseCategories, adminLists] = await Promise.all([
    listProperties(),
    listExpenseCategoriesForSettings(),
    isAdmin
      ? Promise.all([listUsers(), listBankAccounts(), listTransferSchedules()])
      : Promise.resolve(null),
  ]);
  const [users, bankAccounts, transferSchedules] = adminLists ?? [[], [], []];

  const activeBankAccounts = bankAccounts.filter((a) => a.active).length;
  const activeTransferSchedules = transferSchedules.filter((s) => s.active).length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-fg md:text-2xl">Paramètres</h1>
          <p className="text-xs font-medium text-fg/50 md:text-sm">
            Configurez SAMA HOME selon votre établissement.
          </p>
        </div>
      </div>

      {saved ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}
      {passwordChanged ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Mot de passe modifié.
        </p>
      ) : null}

      {/* Carte Établissement — le formulaire existant reste exactement le
          même (même Server Action, même route), simplement intégré dans une
          carte visuelle plutôt qu'en section nue (Option A du lot). */}
      <section className="rounded-2xl border border-brand-orange/20 bg-surface-raised p-4 shadow-card md:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-orange/30 bg-surface-sunken text-brand-orange">
            <DomainIcon />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">Établissement</p>
            <p className="truncate text-xs font-medium text-fg/50">
              {settings?.establishmentName || "Non renseigné"}
            </p>
          </div>
        </div>

        {/* Bloc 17 — logo officiel affiché tel quel, non modifiable ici : voir
            le rapport Phase 11 pour la décision (aucune infrastructure
            d'upload de fichier n'existe dans le projet). */}
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
          <Image
            src="/brand/Sama-Home-icone-Bleu-nuit.png"
            alt="SAMA HOME"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <p className="text-xs font-medium text-fg/50">
            Logo officiel SAMA HOME — non modifiable depuis cette page.
          </p>
        </div>
        <SettingsForm defaultValues={settings ?? undefined} />
      </section>

      {/* Grille des modules réellement disponibles (Lot Paramètres 2) —
          strictement les 7 fonctionnalités avec un backend réel ; aucune
          carte Apparence/Langue/Sécurité/Horaires. */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SettingsCard
          href="/logements"
          icon={<BuildingIcon />}
          title="Logements"
          description={`${propertiesTotal} ${plural(propertiesTotal, "logement", "logements")}`}
        />
        <SettingsCard
          href="/logements"
          icon={<TagIcon />}
          title="Tarifs & durées"
          description="Gérés depuis chaque logement"
        />
        <SettingsCard
          href="/settings/expense-categories"
          icon={<ReceiptIcon />}
          title="Dépenses"
          description={`${expenseCategories.length} ${plural(expenseCategories.length, "catégorie", "catégories")}`}
        />
        {isAdmin ? (
          <>
            <SettingsCard
              href="/settings/users"
              icon={<PeopleIcon />}
              title="Utilisateurs"
              description={`${users.length} ${plural(users.length, "utilisateur", "utilisateurs")}`}
            />
            <SettingsCard
              href="/settings/bank-accounts"
              icon={<WalletIcon />}
              title="Comptes bancaires"
              description={
                bankAccounts.length === 0
                  ? "Aucun compte bancaire"
                  : `${activeBankAccounts} actif${activeBankAccounts > 1 ? "s" : ""} sur ${bankAccounts.length}`
              }
            />
            <SettingsCard
              href="/settings/transfer-schedules"
              icon={<TransferIcon />}
              title="Virements programmés"
              description={
                transferSchedules.length === 0
                  ? "Aucune programmation"
                  : `${activeTransferSchedules} ${plural(activeTransferSchedules, "programmation active", "programmations actives")}`
              }
            />
          </>
        ) : null}
      </div>

      {/* Compte — fonctionnalité réelle existante, non reconstruite en carte
          (hors des 7 cartes autorisées par ce lot), simplement repositionnée
          après la grille. */}
      <section className="mt-6">
        <h2 className="mb-2.5 text-sm font-extrabold text-fg">Compte</h2>
        <p className="mb-2 text-xs font-medium text-fg/50">
          Connecté en tant que {user.name} ({user.role}).
        </p>
        <Link
          href="/settings/password"
          className="flex h-12 items-center justify-center rounded-xl border border-border/15 text-sm font-extrabold text-fg"
        >
          Modifier mon mot de passe
        </Link>
      </section>

      {/* Informations système — jamais de secret (Bloc 13). */}
      <section className="mt-6 mb-2">
        <h2 className="mb-2.5 text-sm font-extrabold text-fg">Informations système</h2>
        <Card className="px-4">
          <Row label="APPLICATION" value="SAMA HOME" />
          <Row label="VERSION" value="0.1.0" />
          <Row label="ENVIRONNEMENT" value={process.env.NODE_ENV ?? "development"} />
        </Card>
      </section>
    </div>
  );
}
