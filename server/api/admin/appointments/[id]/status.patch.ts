import { updateBookingStatus } from '~~/server/services/appointment.service';
import { updateBookingStatusSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');

  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const { status } = updateBookingStatusSchema.parse(body);
  const appointment = await updateBookingStatus(id, status);

  return { appointment };
});
