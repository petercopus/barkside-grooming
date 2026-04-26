import { sendAppointmentReminders } from '~~/server/services/notification.service';

export default defineTask({
  meta: {
    name: 'send-reminders',
    description: 'Send appointment reminder notifications 24h before',
  },
  async run() {
    const sentCount = await sendAppointmentReminders();
    return {
      result: sentCount === 0 ? 'No appointments tomorrow' : `Sent ${sentCount} reminders`,
    };
  },
});
