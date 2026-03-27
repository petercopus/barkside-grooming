import { updateSizeCategory } from '~~/server/services/size-category.service';
import { updateSizeCategorySchema } from '~~/shared/schemas/size-category';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'size-category:manage');

  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const input = updateSizeCategorySchema.parse(body);
  const category = await updateSizeCategory(id, input);

  return { category };
});
