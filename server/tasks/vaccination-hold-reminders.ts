import { sendVaccinationHoldReminders } from '~~/server/services/vaccination-hold.service';

export default defineTask({
  meta: {
    name: 'vaccination-hold-reminders',
    description: 'Send reminder email at ~50% of the document-hold window',
  },
  async run() {
    const sentCount = await sendVaccinationHoldReminders();
    return {
      result:
        sentCount === 0 ? 'No appointments awaiting reminder' : `Sent ${sentCount} reminder(s)`,
    };
  },
});
