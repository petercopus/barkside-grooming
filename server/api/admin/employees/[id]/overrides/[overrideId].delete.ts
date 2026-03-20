import { deleteOverride } from '~~/server/services/schedule.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const overrideId = Number(getRouterParam(event, 'overrideId'));
  await deleteOverride(overrideId);

  return { success: true };
});
