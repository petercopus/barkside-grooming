import { listOverrides } from '~~/server/services/schedule.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:read');

  const id = getRouterParam(event, 'id');
  const overrides = await listOverrides(id!);

  return { overrides };
});
