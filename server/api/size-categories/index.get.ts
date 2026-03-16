import { db } from '~~/server/db';
import { petSizeCategories } from '~~/server/db/schema';

// TODO: move DB call to service for size cats
export default defineEventHandler(async (event) => {
  requireAuth(event);
  const categories = await db.select().from(petSizeCategories).orderBy(petSizeCategories.minWeight);
  return { categories };
});
