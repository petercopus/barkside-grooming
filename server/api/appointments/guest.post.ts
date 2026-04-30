import { createGuestBooking } from '~~/server/services/appointment.service';
import { getAdminUserIds, sendNotification } from '~~/server/services/notification.service';
import { createGuestBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = createGuestBookingSchema.parse(body);
  const appointment = await createGuestBooking(input);

  const guestName = `${input.guestDetails.firstName} ${input.guestDetails.lastName}`;
  getAdminUserIds().then((adminIds) => {
    for (const adminId of adminIds) {
      sendNotification({
        userId: adminId,
        category: 'admin_new_booking',
        title: 'New Booking',
        body: `${guestName} (Guest) booked an appointment.`,
      }).catch((err) => console.error('Admin notification failed:', err));
    }
  });

  return { appointment };
});
