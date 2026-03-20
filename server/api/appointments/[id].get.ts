import { getBooking } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const appointment = await getBooking(id, user.id);

  return { appointment };
});
