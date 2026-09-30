import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function listTariffsForProperty(propertyId: string) {
  await verifySession();
  return prisma.tariff.findMany({
    where: { propertyId },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTariffById(id: string) {
  await verifySession();
  return prisma.tariff.findUnique({ where: { id } });
}
