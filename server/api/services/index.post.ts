import { createService } from '~~/server/services/service.service';
import { createServiceSchema } from '~~/shared/schemas/service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const body = await readBody(event);
  const input = createServiceSchema.parse(body);
  const service = await createService(input);

  return { service };
});
