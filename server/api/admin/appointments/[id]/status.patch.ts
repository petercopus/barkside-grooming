import { updateBookingStatus } from '~~/server/services/appointment.service';
import { sendNotification } from '~~/server/services/notification.service';
import { updateBookingStatusSchema } from '~~/shared/schemas/appointment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');

  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const { status } = updateBookingStatusSchema.parse(body);
  const appointment = await updateBookingStatus(id, status);

  if (appointment.customerId) {
    sendNotification({
      userId: appointment.customerId,
      category: 'appointment_status_changed',
      title: 'Appointment Updated',
      body: `Your appointment status has been changed to ${status}.`,
    }).catch((err) => console.error('Notification failed:', err));
  }

  return { appointment };
});
