import { createBooking } from '~~/server/services/appointment.service';
import { getAdminUserIds, sendNotification } from '~~/server/services/notification.service';
import { ensureStripeCustomer } from '~~/server/services/payment.service';
import { getAppointmentSchedule } from '~~/server/utils/email-context';
import {
  renderAdminNewBookingEmail,
  renderBookingConfirmationEmail,
} from '~~/server/utils/email-templates';
import { createBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'booking:create');
  const body = await readBody(event);
  const input = createBookingSchema.parse(body);

  if (input.paymentMethodId) {
    input.stripeCustomerId = await ensureStripeCustomer(user.id);
  }

  const appointment = await createBooking(user.id, input);
  const schedule = await getAppointmentSchedule(appointment.id);

  // only confirm immediately when no vaccination hold is in place
  if (appointment.status === 'confirmed') {
    const { subject, html } = renderBookingConfirmationEmail({
      recipientName: user.firstName,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
    });
    sendNotification({
      userId: user.id,
      category: 'appointment_confirmed',
      title: subject,
      body: 'Your appointment has been booked successfully.',
      html,
    }).catch((err) => console.error('Notification failed:', err));
  }

  const customerName = `${user.firstName} ${user.lastName}`;
  getAdminUserIds().then((adminIds) => {
    const { subject, html } = renderAdminNewBookingEmail({
      customerName,
      isGuest: false,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
    });

    for (const adminId of adminIds) {
      sendNotification({
        userId: adminId,
        category: 'admin_new_booking',
        title: subject,
        body: `${customerName} booked an appointment.`,
        html,
      }).catch((err) => console.error('Admin notification failed:', err));
    }
  });

  return { appointment };
});
