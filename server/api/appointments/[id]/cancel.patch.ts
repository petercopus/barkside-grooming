import { cancelBooking } from '~~/server/services/appointment.service';
import { sendNotification } from '~~/server/services/notification.service';
import { getAppointmentSchedule } from '~~/server/utils/email-context';
import { renderAppointmentCancelledEmail } from '~~/server/utils/email-templates';

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'booking:cancel');
  const id = getRouterParam(event, 'id')!;
  const appointment = await cancelBooking(id, user.id);

  const schedule = await getAppointmentSchedule(id);
  const { subject, html } = renderAppointmentCancelledEmail({
    recipientName: user.firstName,
    scheduledDate: schedule.scheduledDate,
    startTime: schedule.startTime,
  });

  sendNotification({
    userId: user.id,
    category: 'appointment_cancelled',
    title: subject,
    body: 'Your appointment has been cancelled.',
    html,
  }).catch((err) => console.error('Notification failed:', err));

  return { appointment };
});
