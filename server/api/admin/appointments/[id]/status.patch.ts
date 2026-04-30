import { updateBookingStatus } from '~~/server/services/appointment.service';
import { sendNotification } from '~~/server/services/notification.service';
import { getAppointmentSchedule, getRecipientName } from '~~/server/utils/email-context';
import { renderAppointmentStatusChangedEmail } from '~~/server/utils/email-templates';
import { updateBookingStatusSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');

  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const { status } = updateBookingStatusSchema.parse(body);
  const appointment = await updateBookingStatus(id, status);

  if (appointment.customerId) {
    const recipientName = await getRecipientName(appointment.customerId);
    const schedule = await getAppointmentSchedule(id);
    const { subject, html } = renderAppointmentStatusChangedEmail({
      recipientName,
      status,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
    });

    sendNotification({
      userId: appointment.customerId,
      category: 'appointment_status_changed',
      title: subject,
      body: `Your appointment status has been changed to ${status}.`,
      html,
    }).catch((err) => console.error('Notification failed:', err));
  }

  return { appointment };
});
