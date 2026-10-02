import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PropertyPhoto } from "@/app/logements/property-photo";
import { StatusBadge } from "@/app/logements/status-badge";
import type { PropertyStatus } from "@/lib/property-status";

export type PropertyGridItem = {
  id: string;
  name: string;
  type: "ROOM" | "APARTMENT";
  photo: string | null;
  status: PropertyStatus;
};

/**
 * "État des logements" — maquettes tablette (4 cartes) et PC (8 cartes),
 * même composant, juste un `items` plus long côté appelant. Réutilise
 * PropertyPhoto et StatusBadge (déjà utilisés sur /logements), aucune
 * nouvelle logique de statut.
 */
export function PropertyStatusGrid({ items }: { items: PropertyGridItem[] }) {
  if (items.length === 0) {
    return <p className="mt-2.5 text-sm font-medium text-navy/50">Aucun logement enregistré.</p>;
  }
  return (
    <div className="mt-2.5 grid grid-cols-4 gap-3">
      {items.map((property) => (
        <Link key={property.id} href={`/logements/${property.id}`}>
          <Card className="overflow-hidden p-0">
            <PropertyPhoto photo={property.photo} type={property.type} className="h-20 w-full" />
            <div className="p-2.5">
              <p className="truncate text-xs font-extrabold text-navy">{property.name}</p>
              <div className="mt-1.5">
                <StatusBadge status={property.status} />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
