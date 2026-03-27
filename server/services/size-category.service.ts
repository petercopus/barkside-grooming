import { and, eq, ne } from 'drizzle-orm';
import { db } from '~~/server/db';
import { petSizeCategories, pets, servicePricing } from '~~/server/db/schema';
import type {
  CreateSizeCategoryInput,
  UpdateSizeCategoryInput,
} from '~~/shared/schemas/size-category';

export async function listSizeCategories() {
  return db.select().from(petSizeCategories).orderBy(petSizeCategories.minWeight);
}

export async function getSizeCategory(id: number) {
  const [category] = await db
    .select()
    .from(petSizeCategories)
    .where(eq(petSizeCategories.id, id));
  if (!category) throw createError({ statusCode: 404, message: 'Size category not found' });
  return category;
}

export async function createSizeCategory(input: CreateSizeCategoryInput) {
  await checkWeightOverlap(input.minWeight, input.maxWeight);
  const [category] = await db.insert(petSizeCategories).values(input).returning();
  return category;
}

export async function updateSizeCategory(id: number, input: UpdateSizeCategoryInput) {
  const existing = await getSizeCategory(id);

  const mergedMin = input.minWeight ?? existing.minWeight;
  const mergedMax = input.maxWeight ?? existing.maxWeight;

  if (input.minWeight != null || input.maxWeight != null) {
    await checkWeightOverlap(mergedMin, mergedMax, id);
  }

  const [updated] = await db
    .update(petSizeCategories)
    .set(input)
    .where(eq(petSizeCategories.id, id))
    .returning();
  return updated;
}

export async function deleteSizeCategory(id: number) {
  await getSizeCategory(id);

  // Check for service pricing references
  const [pricingRef] = await db
    .select({ id: servicePricing.id })
    .from(servicePricing)
    .where(eq(servicePricing.sizeCategoryId, id))
    .limit(1);

  if (pricingRef) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete: this size category is used by one or more service pricing entries',
    });
  }

  // Check for pet references
  const [petRef] = await db
    .select({ id: pets.id })
    .from(pets)
    .where(eq(pets.sizeCategoryId, id))
    .limit(1);

  if (petRef) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete: this size category is assigned to one or more pets',
    });
  }

  await db.delete(petSizeCategories).where(eq(petSizeCategories.id, id));
}

// ── Helpers ──────────────────────────────────────────────

async function checkWeightOverlap(min: number, max: number, excludeId?: number) {
  const allCategories = excludeId
    ? await db
        .select()
        .from(petSizeCategories)
        .where(ne(petSizeCategories.id, excludeId))
    : await db.select().from(petSizeCategories);

  const overlap = allCategories.find((cat) => cat.minWeight <= max && cat.maxWeight >= min);

  if (overlap) {
    throw createError({
      statusCode: 409,
      message: `Weight range overlaps with "${overlap.name}" (${overlap.minWeight}–${overlap.maxWeight} lbs)`,
    });
  }
}
