import { getAvailableSlots } from '~~/server/services/schedule.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const date = query.date as string;
  if (!date || !DATE_RE.test(date) || Number.isNaN(new Date(date).getTime())) {
    throw createError({ statusCode: 400, message: 'date must be in YYYY-MM-DD format' });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    throw createError({ statusCode: 400, message: 'date cannot be in the past' });
  }

  const duration = Number(query.duration);
  if (!duration || duration <= 0) {
    throw createError({ statusCode: 400, message: 'duration (minutes) is required' });
  }

  const serviceIds = query.serviceIds ? String(query.serviceIds).split(',').map(Number) : undefined;

  const slots = await getAvailableSlots(date, duration, serviceIds);

  return { slots };
});
