import { updateBundle } from '~~/server/services/bundle.service';
import { updateBundleSchema } from '~~/shared/schemas/bundle';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const input = updateBundleSchema.parse(body);
  const bundle = await updateBundle(id, input);

  return { bundle };
});
