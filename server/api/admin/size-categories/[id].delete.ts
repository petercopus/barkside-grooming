import { deleteSizeCategory } from '~~/server/services/size-category.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'size-category:manage');

  const id = Number(getRouterParam(event, 'id'));
  await deleteSizeCategory(id);

  return { success: true };
});
