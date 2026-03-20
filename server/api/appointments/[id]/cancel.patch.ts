import { cancelBooking } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const appointment = await cancelBooking(id, user.id);

  return { appointment };
});
