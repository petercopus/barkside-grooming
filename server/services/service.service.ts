import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { serviceAddons, servicePricing, services } from '~~/server/db/schema';
import type {
  CreateServiceInput,
  ServicePricingInput,
  UpdateServiceInput,
} from '~~/shared/schemas/service';

//#region SERVICES
export async function listServices(includeInactive = false) {
  const query = db.select().from(services).orderBy(services.sortOrder);

  if (!includeInactive) return query.where(eq(services.isActive, true));
  return query;
}

export async function getService(id: number) {
  const [service] = await db.select().from(services).where(eq(services.id, id));
  if (!service) throw createError({ statusCode: 404, message: 'Servie not found' });
  return service;
}

export async function createService(input: CreateServiceInput) {
  const [service] = await db.insert(services).values(input).returning();
  return service;
}

export async function updateService(id: number, input: UpdateServiceInput) {
  await getService(id);
  const [updated] = await db.update(services).set(input).where(eq(services.id, id)).returning();
  return updated;
}

export async function deleteService(id: number) {
  await getService(id);
  await db.update(services).set({ isActive: false }).where(eq(services.id, id));
}
//#endregion

//#region ADDONS
/**
 * Get which base services an addon is compatible with
 */
export async function getServiceAddonLinks(addonServiceId: number) {
  const rows = await db
    .select({ baseServiceId: serviceAddons.baseServiceId })
    .from(serviceAddons)
    .where(eq(serviceAddons.addonServiceId, addonServiceId));

  return rows.map((r) => r.baseServiceId);
}

/**
 * Set which base services an addon is compatible with
 */
export async function setServiceAddonLinks(addonServiceId: number, baseServiceIds: number[]) {
  await db.transaction(async (tx) => {
    await tx.delete(serviceAddons).where(eq(serviceAddons.addonServiceId, addonServiceId));

    if (baseServiceIds.length > 0) {
      await tx
        .insert(serviceAddons)
        .values(baseServiceIds.map((baseServiceId) => ({ baseServiceId, addonServiceId })));
    }
  });
}

/**
 * Get which addons are available for a base service
 */
export async function getBaseServiceAddonLinks(baseServiceId: number) {
  const rows = await db
    .select({ addonServiceId: serviceAddons.addonServiceId })
    .from(serviceAddons)
    .where(eq(serviceAddons.baseServiceId, baseServiceId));

  return rows.map((r) => r.addonServiceId);
}

/**
 * Set which addons are available for a base service
 */
export async function setBaseServiceAddonLinks(baseServiceId: number, addonServiceIds: number[]) {
  await db.transaction(async (tx) => {
    await tx.delete(serviceAddons).where(eq(serviceAddons.baseServiceId, baseServiceId));

    if (addonServiceIds.length > 0) {
      await tx
        .insert(serviceAddons)
        .values(addonServiceIds.map((addonServiceId) => ({ baseServiceId, addonServiceId })));
    }
  });
}

export async function getAddonMap() {
  const rows = await db.select().from(serviceAddons);

  const map: Record<number, number[]> = {};
  for (const row of rows) {
    if (!map[row.baseServiceId]) map[row.baseServiceId] = [];
    map[row.baseServiceId]?.push(row.addonServiceId);
  }

  return map;
}
//#endregion

//#region PRICING
export async function getServicePricing(serviceId: number) {
  return db.select().from(servicePricing).where(eq(servicePricing.serviceId, serviceId));
}

export async function setServicePricing(serviceId: number, pricing: ServicePricingInput[]) {
  await getService(serviceId);

  // full delete + insert inside transaction
  // easier than diffing each row
  await db.transaction(async (tx) => {
    await tx.delete(servicePricing).where(eq(servicePricing.serviceId, serviceId));

    if (pricing.length > 0) {
      await tx.insert(servicePricing).values(pricing.map((p) => ({ serviceId, ...p })));
    }
  });

  return getServicePricing(serviceId);
}
//#endregion
