import { listOverrides } from '~~/server/services/schedule.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const overrides = await listOverrides(id!);

  return { overrides };
});
