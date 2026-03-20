import { createBooking } from '~~/server/services/appointment.service';
import { createBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = createBookingSchema.parse(body);
  const appointment = await createBooking(user.id, input);

  return { appointment };
});
