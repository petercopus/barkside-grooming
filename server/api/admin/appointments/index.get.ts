import { listAllBookings } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');

  const query = getQuery(event);
  const appointments = await listAllBookings({
    status: query.status as string | undefined,
    date: query.date as string | undefined,
  });

  return { appointments };
});
