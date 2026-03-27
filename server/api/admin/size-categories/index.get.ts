import { listSizeCategories } from '~~/server/services/size-category.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const categories = await listSizeCategories();
  return { categories };
});
