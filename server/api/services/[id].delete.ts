import { deleteService } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');

  const id = Number(getRouterParam(event, 'id'));
  await deleteService(id);

  return { success: true };
});
