import { eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { bundles, bundleServices } from '~~/server/db/schema';
import type { CreateBundleInput, UpdateBundleInput } from '~~/shared/schemas/bundle';

export async function listBundles(includeInactive = false) {
  // 1. Fetch bundles
  const bundleRows = includeInactive
    ? await db.select().from(bundles)
    : await db.select().from(bundles).where(eq(bundles.isActive, true));

  if (bundleRows.length === 0) return [];

  // 2. Batch fetch all bundle/service associations
  const bundleIds = bundleRows.map((b) => b.id);
  const bsRows = await db
    .select()
    .from(bundleServices)
    .where(inArray(bundleServices.bundleId, bundleIds));

  // 3. Group serviceIds by bundleId
  return bundleRows.map((b) => ({
    ...b,
    serviceIds: bsRows.filter((bs) => bs.bundleId === b.id).map((bs) => bs.serviceId),
  }));
}

export async function getBundle(id: number) {
  const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id));

  if (!bundle) {
    throw createError({ statusCode: 404, message: 'Bundle not found' });
  }

  const bsRows = await db.select().from(bundleServices).where(eq(bundleServices.bundleId, id));

  return {
    ...bundle,
    serviceIds: bsRows.map((bs) => bs.serviceId),
  };
}

export async function createBundle(input: CreateBundleInput) {
  const { serviceIds, ...bundleData } = input;

  return db.transaction(async (tx) => {
    const [bundle] = await tx.insert(bundles).values(bundleData).returning();

    if (!bundle) {
      throw createError({ statusCode: 500, message: 'Create bundle failed' });
    }

    await tx
      .insert(bundleServices)
      .values(serviceIds.map((serviceId) => ({ bundleId: bundle.id, serviceId })));

    return { ...bundle, serviceIds };
  });
}

export async function updateBundle(id: number, input: UpdateBundleInput) {
  const { serviceIds, ...bundleData } = input;

  await db.transaction(async (tx) => {
    // update bundle fields if any provided
    if (Object.keys(bundleData).length > 0) {
      const [updated] = await tx
        .update(bundles)
        .set(bundleData)
        .where(eq(bundles.id, id))
        .returning();

      if (!updated) {
        throw createError({ statusCode: 404, message: 'Bundle not found' });
      }
    }

    // replace service associations if provided
    if (serviceIds) {
      await tx.delete(bundleServices).where(eq(bundleServices.bundleId, id));

      if (serviceIds.length > 0) {
        await tx
          .insert(bundleServices)
          .values(serviceIds.map((serviceId) => ({ bundleId: id, serviceId })));
      }
    }
  });

  return getBundle(id);
}

export async function deleteBundle(id: number) {
  const [bundle] = await db
    .update(bundles)
    .set({ isActive: false })
    .where(eq(bundles.id, id))
    .returning();

  if (!bundle) {
    throw createError({ statusCode: 404, message: 'Bundle not found' });
  }

  return bundle;
}
