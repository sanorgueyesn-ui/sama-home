import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { listBankTransfers, listBankAccounts } from "@/lib/bank-data";
import { generateDueScheduledTransfers } from "@/app/actions/bank";
import { BankTransferStatusBadge } from "./bank-transfer-status-badge";
import { BankTransferRowActions } from "./bank-transfer-row-actions";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Bloc G — page `/caisse/virements`. Accès ouvert à ADMIN et GESTIONNAIRE
 * (section 16), même garde que `listBankTransfers()`/`listBankAccounts()`
 * (`verifySession()`, gelées). `listBankTransfers()` ne fait pas
 * d'`include` vers `BankAccount` — jointe ici en mémoire avec
 * `listBankAccounts()` (déjà existante, gelée) plutôt que de modifier le
 * service de lecture. Noms d'utilisateurs résolus directement via `prisma`
 * (même précédent que `src/app/page.tsx`/`src/app/caisse/page.tsx`).
 */
export default async function BankTransfersPage(props: PageProps<"/caisse/virements">) {
  await verifySession();
  const { done } = await props.searchParams;

  // Bloc H.3 — déclenchement lazy du moteur de virements programmés (gelé,
  // Bloc 17.2/H.0/H.1) directement lié au rendu serveur de cette page.
  // Doit s'exécuter AVANT listBankTransfers() : un virement SCHEDULED
  // généré à l'instant doit apparaître dans la liste affichée par ce même
  // rendu, sans rechargement manuel. Une erreur ici est récupérable — elle
  // ne doit pas rendre la page inutilisable (l'utilisateur doit pouvoir
  // consulter ses virements existants même si la génération échoue) ; elle
  // est journalisée avec la seule convention déjà en place dans ce projet
  // (console.error, voir src/app/error.tsx), jamais masquée.
  try {
    await generateDueScheduledTransfers();
  } catch (error) {
    console.error("generateDueScheduledTransfers() a échoué pendant le rendu de /caisse/virements :", error);
  }

  const [transfers, accounts] = await Promise.all([listBankTransfers(), listBankAccounts()]);
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const userIds = [
    ...new Set(
      transfers.flatMap((t) => [t.createdByUserId, t.effectedByUserId].filter((v): v is string => Boolean(v))),
    ),
  ];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const userName = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? "—") : "—");

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-6 pb-24 md:pb-10">
      <div className="flex items-center gap-3">
        <Link
          href="/caisse"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-navy">Virements bancaires</h1>
        <Link
          href="/caisse/virements/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouveau
        </Link>
      </div>
      <p className="mt-1 text-xs font-medium text-navy/50">
        Transferts d&apos;argent de la caisse vers les comptes bancaires.
      </p>

      <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-xs font-medium text-navy/60">
        Un virement bancaire transfère de l&apos;argent de la caisse vers la banque. Il ne constitue pas une dépense.
      </p>

      {done === "created" ? (
        <p className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">Virement créé.</p>
      ) : null}

      {transfers.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h9M9 7l5 5-5 5" />
                <rect x="15" y="5" width="6" height="14" rx="1.5" />
              </svg>
            }
            title="Aucun virement bancaire"
            description="Les virements effectués depuis la caisse apparaîtront ici."
            action={
              <Link
                href="/caisse/virements/new"
                className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
              >
                + Nouveau virement
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {transfers.map((t) => {
            const account = accountById.get(t.bankAccountId);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-navy">{fmtFcfa(t.amount)}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-navy/60">
                      {account ? `${account.label} · ${account.bankName}` : "Compte introuvable"}
                    </p>
                  </div>
                  <BankTransferStatusBadge status={t.status} />
                </div>

                {/* Bloc G, section 13 — traçabilité : uniquement les champs
                    réellement présents sur BankTransfer, rien d'inventé. */}
                <div className="mt-2.5 flex flex-col gap-0.5 text-xs font-medium text-navy/50">
                  <span>
                    Créé le {fmtDateTime(t.createdAt)} par {userName(t.createdByUserId)}
                  </span>
                  {t.scheduledAt ? <span>Prévu le {fmtDateTime(t.scheduledAt)}</span> : null}
                  {t.status === "EFFECTED" && t.effectedAt ? (
                    <span>
                      Effectué le {fmtDateTime(t.effectedAt)} par {userName(t.effectedByUserId)}
                    </span>
                  ) : null}
                  {t.reference ? <span>Réf. {t.reference}</span> : null}
                  {t.note ? <span>{t.note}</span> : null}
                  {t.transferScheduleId ? <span>Généré par une programmation automatique</span> : null}
                </div>

                <div className="mt-3">
                  <BankTransferRowActions id={t.id} status={t.status} amount={t.amount} accountLabel={account?.label ?? "ce compte"} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
