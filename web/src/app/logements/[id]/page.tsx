import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/app/logements/status-badge";
import { PropertyPhoto } from "@/app/logements/property-photo";
import { ToggleActiveButton } from "./toggle-active-button";
import { TariffRowActions } from "./tariffs/tariff-row-actions";
import { getPropertyById } from "@/lib/properties-data";
import { listTariffsForProperty } from "@/lib/tariffs-data";
import { computePropertyStatus } from "@/lib/property-status";

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ |,/g, " ")} FCFA`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#E7EAEE] py-3 last:border-0">
      <p className="text-[11px] font-bold text-navy/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

export default async function PropertyDetailPage(props: PageProps<"/logements/[id]">) {
  const { id } = await props.params;
  const { created, updated, tariffCreated, tariffUpdated } = await props.searchParams;

  const property = await getPropertyById(id);
  if (!property) {
    notFound();
  }

  const status = computePropertyStatus(property);
  const tariffs = await listTariffsForProperty(property.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/logements"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-navy">{property.name}</h1>
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Logement créé avec succès.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}
      {tariffCreated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Tarif créé avec succès.
        </p>
      ) : null}
      {tariffUpdated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Tarif modifié avec succès.
        </p>
      ) : null}

      <PropertyPhoto photo={property.photo} type={property.type} className="h-44 w-full rounded-2xl" />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-navy/70">
          {property.type === "ROOM" ? "Chambre meublée" : "Appartement meublé"}
        </p>
        <StatusBadge status={status} />
      </div>

      <Card className="mt-3 px-4">
        <Row label="CAPACITÉ" value={`${property.capacity} personne${property.capacity > 1 ? "s" : ""}`} />
        <Row label="DESCRIPTION" value={property.description ?? "—"} />
        <Row
          label="LOGEMENT DEPUIS"
          value={new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(property.createdAt)}
        />
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-navy/50">TARIFS</p>
        <Link href={`/logements/${property.id}/tariffs/new`} className="text-xs font-bold text-coral">
          + Ajouter un tarif
        </Link>
      </div>

      {tariffs.length === 0 ? (
        <Card className="mt-2 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-navy">Aucun tarif pour ce logement</p>
          <p className="mt-1 text-xs text-navy/60">
            Ajoutez au moins un tarif pour pouvoir proposer ce logement.
          </p>
        </Card>
      ) : (
        <Card className="mt-2 px-4">
          {tariffs.map((tariff) => (
            <div
              key={tariff.id}
              className="flex items-center justify-between gap-3 border-b border-[#E7EAEE] py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/logements/${property.id}/tariffs/${tariff.id}/edit`}
                    className="truncate text-sm font-bold text-navy underline-offset-2 hover:underline"
                  >
                    {tariff.label}
                  </Link>
                  {!tariff.active ? (
                    <span className="shrink-0 rounded-full bg-neutral-bg px-2 py-0.5 text-[10px] font-bold text-neutral">
                      Inactif
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-navy/60">{formatFcfa(tariff.amount)}</p>
              </div>
              <TariffRowActions id={tariff.id} active={tariff.active} />
            </div>
          ))}
        </Card>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {property.active && tariffs.some((t) => t.active) ? (
          <Link
            href={`/reservations/new?propertyId=${property.id}`}
            className="flex h-14 items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white"
          >
            Réserver
          </Link>
        ) : null}
        <Link
          href={`/logements/${property.id}/edit`}
          className="flex h-14 items-center justify-center rounded-2xl border border-navy/15 text-sm font-extrabold text-navy"
        >
          Modifier
        </Link>
        <ToggleActiveButton id={property.id} active={property.active} />
      </div>
    </div>
  );
}
