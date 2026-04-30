import { createGuestBooking } from '~~/server/services/appointment.service';
import { getAdminUserIds, sendNotification } from '~~/server/services/notification.service';
import { getAppointmentSchedule } from '~~/server/utils/email-context';
import { renderAdminNewBookingEmail } from '~~/server/utils/email-templates';
import { createGuestBookingSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = createGuestBookingSchema.parse(body);
  const appointment = await createGuestBooking(input);

  const guestName = `${input.guestDetails.firstName} ${input.guestDetails.lastName}`;
  getAdminUserIds().then(async (adminIds) => {
    const schedule = await getAppointmentSchedule(appointment.id);
    const { subject, html } = renderAdminNewBookingEmail({
      customerName: guestName,
      isGuest: true,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
    });

    for (const adminId of adminIds) {
      sendNotification({
        userId: adminId,
        category: 'admin_new_booking',
        title: subject,
        body: `${guestName} (Guest) booked an appointment.`,
        html,
      }).catch((err) => console.error('Admin notification failed:', err));
    }
  });

  return { appointment };
});
