import { listServies } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const perms: string[] = event.context.permissions ?? [];
  const includeInactive = perms.includes('service:manage');
  const allServices = await listServies(includeInactive);
  return { services: allServices };
});
