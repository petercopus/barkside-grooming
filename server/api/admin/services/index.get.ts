import { listServices } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const services = await listServices(true);
  return { services };
});
