import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { CONTRACT_THEMES } from "@/lib/documents/contract-themes";
import { contractTitle } from "@/lib/documents/contract-clauses";
import { CONTRACT_KINDS, TICKET_KINDS, TICKET_WIDTHS } from "@/lib/documents/preview-params";
import { TICKET_KIND_LABELS, TICKET_THEMES } from "@/lib/documents/ticket-themes";
import type { ContractKind, TicketKind, TicketWidth } from "@/lib/documents/types";
import { SettingsBlock, SettingsPageHeader } from "../settings-ui";
import { DocumentThumbnail } from "./document-thumbnail";
import { ChoosePresentation } from "./choose-presentation";
import { getSettings } from "@/lib/settings-data";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Documents — SAMA HOME" };

type Search = { contrat?: string; ticket?: string; largeur?: string };

const CONTRACT_KIND_LABELS: Record<ContractKind, string> = {
  HOTEL_STAY: "Hôtel : hébergement",
  LEASE_3Y: "Résidence : bail de 3 ans",
  LEASE_OPEN: "Résidence : bail indéterminé",
};

const WIDTH_LABELS: Record<TicketWidth, string> = { "58": "58 mm", "80": "80 mm", a4: "A4" };

/** « BAIL D'HABITATION MEUBLÉ » → « Bail d'habitation meublé ». */
const sentence = (text: string) => `${text.charAt(0)}${text.slice(1).toLowerCase()}`;

/** Valeur de l'URL ramenée à une valeur connue : une valeur forgée retombe sur le défaut, sans effet. */
function pick<T extends string>(raw: string | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
}

async function Pills<T extends string>({
  label,
  param,
  values,
  labels,
  current,
  query,
}: {
  label: string;
  param: keyof Search;
  values: readonly T[];
  labels: Record<T, string>;
  current: T;
  query: Search;
}) {
  const t = await getT();
  return (
    <nav aria-label={t(label)} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-xs font-bold text-fg/55 sm:w-14 sm:shrink-0"><T>{label}</T></span>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
      {values.map((value) => {
        const active = value === current;
        const next = new URLSearchParams(Object.entries({ ...query, [param]: value }).filter(([, v]) => v) as [string, string][]);
        return (
          <Link
            key={value}
            href={`/settings/documents?${next.toString()}`}
            aria-current={active ? "true" : undefined}
            className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
              active ? "bg-fg text-surface" : "border border-border/15 bg-surface-raised text-fg/70 hover:text-fg"
            }`}
          >
            <T>{labels[value]}</T>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}

const Thumbnail = DocumentThumbnail;

export default async function DocumentsLibraryPage(props: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const t = await getT();
  const search = await props.searchParams;
  const contractKind = pick<ContractKind>(search.contrat, CONTRACT_KINDS, "LEASE_3Y");
  const ticketKind = pick<TicketKind>(search.ticket, TICKET_KINDS, "PAYMENT");
  const width = pick<TicketWidth>(search.largeur, TICKET_WIDTHS, "80");
  const settings = await getSettings();
  const chosenContract = settings?.documentContractTheme ?? 1;
  const chosenTicket = settings?.documentTicketTheme ?? 1;
  const chosenPaper = settings?.documentTicketPaper ?? "80";
  const query: Search = { contrat: contractKind, ticket: ticketKind, largeur: width };
  const base = "/settings/documents/preview";

  return (
    <>
      <SettingsPageHeader
        title="Documents"
        description="Les présentations de vos contrats, quittances et tickets de caisse, avec des données d'exemple et les couleurs de votre établissement."
      />

      <div className="flex flex-col gap-10">
        <SettingsBlock
          title="Contrats de location"
          description={`${sentence(contractTitle(contractKind).title)} : ${contractTitle(contractKind).subtitle.toLowerCase()}. Le texte est le même quelle que soit la présentation.`}
          divider={false}
        >
          <Pills label="Contrat" param="contrat" values={CONTRACT_KINDS} labels={CONTRACT_KIND_LABELS} current={contractKind} query={query} />
          <ul className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {CONTRACT_THEMES.map((theme) => (
              <li key={theme.id}>
                <Thumbnail src={`${base}?family=contract&theme=${theme.id}&kind=${contractKind}`} title={t(`Contrat, présentation ${theme.name}`)} ratio="aspect-[1/1.414]" />
                <p className="mt-2 text-sm font-bold text-fg">
                  {theme.id}. <T>{theme.name}</T>
                </p>
                <p className="text-xs text-fg/55"><T>{theme.description}</T></p>
                <ChoosePresentation kind="contract" theme={theme.id} paper={null} selected={chosenContract === theme.id} />
              </li>
            ))}
          </ul>
        </SettingsBlock>

        <SettingsBlock
          title="Quittance de loyer"
          description="Pour les résidences. Elle utilise la même présentation que le contrat choisi. Un paiement partiel donne un reçu pour paiement partiel, jamais une quittance."
        >
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {CONTRACT_THEMES.map((theme) => (
              <li key={theme.id}>
                <Thumbnail src={`${base}?family=quittance&theme=${theme.id}`} title={t(`Quittance, présentation ${theme.name}`)} ratio="aspect-[1/1.414]" />
                <p className="mt-2 text-sm font-bold text-fg">
                  {theme.id}. <T>{theme.name}</T>
                </p>
                <ChoosePresentation kind="contract" theme={theme.id} paper={null} selected={chosenContract === theme.id} />
              </li>
            ))}
          </ul>
        </SettingsBlock>

        <SettingsBlock title="Tickets de caisse" description="Pour les hôtels. Papier thermique de 58 ou 80 mm, ou page A4. Les résidences n'ont pas de ticket.">
          <div className="flex flex-col gap-2.5">
            <Pills label="Ticket" param="ticket" values={TICKET_KINDS} labels={TICKET_KIND_LABELS} current={ticketKind} query={query} />
            <Pills label="Papier" param="largeur" values={TICKET_WIDTHS} labels={WIDTH_LABELS} current={width} query={query} />
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {TICKET_THEMES.map((theme) => (
              <li key={theme.id}>
                <Thumbnail
                  src={`${base}?family=ticket&theme=${theme.id}&kind=${ticketKind}&width=${width}`}
                  title={t(`Ticket, présentation ${theme.name}`)}
                  ratio={width === "a4" ? "aspect-[1/1.414]" : "aspect-[1/1.9]"}
                />
                <p className="mt-2 text-sm font-bold text-fg">
                  {theme.id}. <T>{theme.name}</T>
                </p>
                <p className="text-xs text-fg/55"><T>{theme.description}</T></p>
                <ChoosePresentation kind="ticket" theme={theme.id} paper={width} selected={chosenTicket === theme.id && chosenPaper === width} />
              </li>
            ))}
          </ul>
        </SettingsBlock>
      </div>
    </>
  );
}
