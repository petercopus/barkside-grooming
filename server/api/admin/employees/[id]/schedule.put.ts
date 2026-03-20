import { setWeeklySchedule } from '~~/server/services/schedule.service';
import { setWeeklyScheduleSchema } from '~~/shared/schemas/schedule';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const input = setWeeklyScheduleSchema.parse(body);
  const entries = await setWeeklySchedule(id!, input.entries);

  return { entries };
});
