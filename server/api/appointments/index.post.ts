import { createBooking } from '~~/server/services/appointment.service';
import { getAdminUserIds, sendNotification } from '~~/server/services/notification.service';
import { ensureStripeCustomer } from '~~/server/services/payment.service';
import { createBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = createBookingSchema.parse(body);

  if (input.paymentMethodId) {
    input.stripeCustomerId = await ensureStripeCustomer(user.id);
  }

  const appointment = await createBooking(user.id, input);

  sendNotification({
    userId: user.id,
    category: 'appointment_confirmed',
    title: 'Booking Confirmed',
    body: 'Your appointment has been booked successfully.',
  }).catch((err) => console.error('Notification failed:', err));

  getAdminUserIds().then((adminIds) => {
    for (const adminId of adminIds) {
      sendNotification({
        userId: adminId,
        category: 'admin_new_booking',
        title: 'New Booking',
        body: `${user.firstName} ${user.lastName} booked an appointment.`,
      }).catch((err) => console.error('Admin notification failed:', err));
    }
  });

  return { appointment };
});
