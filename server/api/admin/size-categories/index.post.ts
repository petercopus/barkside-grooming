import { createSizeCategory } from '~~/server/services/size-category.service';
import { createSizeCategorySchema } from '~~/shared/schemas/size-category';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'size-category:manage');
  const body = await readBody(event);
  const input = createSizeCategorySchema.parse(body);
  const category = await createSizeCategory(input);

  return { category };
});
