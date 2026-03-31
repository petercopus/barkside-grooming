import { deleteBundle } from '~~/server/services/bundle.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const id = Number(getRouterParam(event, 'id'));
  await deleteBundle(id);

  return { success: true };
});
