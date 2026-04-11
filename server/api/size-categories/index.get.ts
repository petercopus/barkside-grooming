import { db } from '~~/server/db';
import { petSizeCategories } from '~~/server/db/schema';

export default defineEventHandler(async () => {
  const sizeCategories = await db
    .select()
    .from(petSizeCategories)
    .orderBy(petSizeCategories.minWeight);

  return { sizeCategories };
});
