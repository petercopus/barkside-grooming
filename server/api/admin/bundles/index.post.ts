import { createBundle } from '~~/server/services/bundle.service';
import { createBundleSchema } from '~~/shared/schemas/bundle';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const body = await readBody(event);
  const input = createBundleSchema.parse(body);
  const bundle = await createBundle(input);

  return { bundle };
});
