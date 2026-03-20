import { updateService } from '~~/server/services/service.service';
import { updateServiceSchema } from '~~/shared/schemas/service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');

  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const input = updateServiceSchema.parse(body);
  const service = await updateService(id, input);

  return { service };
});
