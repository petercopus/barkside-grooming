import { createOverride } from '~~/server/services/schedule.service';
import { createOverrideSchema } from '~~/shared/schemas/schedule';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const input = createOverrideSchema.parse(body);
  const override = await createOverride(id!, input);

  return { override };
});
