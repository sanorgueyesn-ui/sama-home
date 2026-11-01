import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { EMPTY_GUEST_INFO, isGuestInfoMode, type GuestInfoSettings } from "@/lib/guest-info";

/**
 * Informations d'accueil du séjour de l'espace ACTIF de la session (jamais d'un autre espace, jamais
 * choisi par le navigateur). Pour une Agence immobilière, ou sans espace, ces informations n'existent
 * pas : `enabled` vaut `false` et rien n'est lu en base.
 */
export type GuestInfoContext =
  | { enabled: false }
  | { enabled: true; settings: GuestInfoSettings; establishmentName: string; receptionPhone: string | null };

export async function getGuestInfoContext(): Promise<GuestInfoContext> {
  const user = await getCurrentUser();
  if (!user.establishmentId) return { enabled: false };

  const establishment = await prisma.establishment.findFirst({
    where: { id: user.establishmentId },
    select: {
      businessMode: true,
      name: true,
      settings: {
        select: {
          establishmentName: true,
          phone: true,
          guestWifiName: true,
          guestWifiPassword: true,
          guestTvInstructions: true,
          guestAcInstructions: true,
          guestHouseRules: true,
          guestExtraInfo: true,
          guestCheckoutTime: true,
          guestIncludeEmergency: true,
        },
      },
    },
  });
  if (!establishment || !isGuestInfoMode(establishment.businessMode)) return { enabled: false };

  const s = establishment.settings;
  return {
    enabled: true,
    establishmentName: s?.establishmentName ?? establishment.name,
    receptionPhone: s?.phone ?? null,
    settings: s
      ? {
          wifiName: s.guestWifiName,
          wifiPassword: s.guestWifiPassword,
          tvInstructions: s.guestTvInstructions,
          acInstructions: s.guestAcInstructions,
          houseRules: s.guestHouseRules,
          extraInfo: s.guestExtraInfo,
          checkoutTime: s.guestCheckoutTime,
          includeEmergency: s.guestIncludeEmergency,
        }
      : EMPTY_GUEST_INFO,
  };
}
