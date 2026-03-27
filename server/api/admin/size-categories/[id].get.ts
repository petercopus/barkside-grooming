import { getSizeCategory } from '~~/server/services/size-category.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const id = Number(getRouterParam(event, 'id'));
  const category = await getSizeCategory(id);
  return { category };
});
