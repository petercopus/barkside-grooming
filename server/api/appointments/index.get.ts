import { listBookings } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const appointments = await listBookings(user.id);

  return { appointments };
});
