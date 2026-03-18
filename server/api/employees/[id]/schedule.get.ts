import { getWeeklySchedule } from '~~/server/services/schedule.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:read');

  const id = getRouterParam(event, 'id');
  const entries = await getWeeklySchedule(id!);

  return { entries };
});
