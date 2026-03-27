import { getAvailableSlots } from '~~/server/services/schedule.service';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const date = query.date as string;
  if (!date) {
    throw createError({ statusCode: 400, message: 'date is required' });
  }

  const duration = Number(query.duration);
  if (!duration || duration <= 0) {
    throw createError({ statusCode: 400, message: 'duration (minutes) is required' });
  }

  const serviceIds = query.serviceIds
    ? String(query.serviceIds).split(',').map(Number)
    : undefined;

  const slots = await getAvailableSlots(date, duration, serviceIds);

  return { slots };
});
