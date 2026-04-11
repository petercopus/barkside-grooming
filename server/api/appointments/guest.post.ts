import { createGuestBooking } from '~~/server/services/appointment.service';
import { createGuestBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = createGuestBookingSchema.parse(body);
  const appointmentId = await createGuestBooking(input);

  return { appointmentId };
});
