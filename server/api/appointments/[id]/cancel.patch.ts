import { cancelBooking } from '~~/server/services/appointment.service';
import { sendNotification } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const appointment = await cancelBooking(id, user.id);

  sendNotification({
    userId: user.id,
    category: 'appointment_cancelled',
    title: 'Appointment Cancelled',
    body: 'Your appointment has been cancelled.',
  }).catch((err) => console.error('Notification failed:', err));

  return { appointment };
});
