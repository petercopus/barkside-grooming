import { updateOverride } from '~~/server/services/schedule.service';
import { updateOverrideSchema } from '~~/shared/schemas/schedule';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const overrideId = Number(getRouterParam(event, 'overrideId'));
  const body = await readBody(event);
  const input = updateOverrideSchema.parse(body);
  const override = await updateOverride(overrideId, input);

  return { override };
});
