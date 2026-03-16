import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { servicePricing, services } from '~~/server/db/schema';
import type {
  CreateServiceInput,
  ServicePricingInput,
  UpdateServiceInput,
} from '~~/shared/schemas/service';

export async function listServies(includeInactive = false) {
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

// PRICING
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
