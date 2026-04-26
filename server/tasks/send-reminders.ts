import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments } from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';

export default defineTask({
  meta: {
    name: 'send-reminders',
    description: 'Send appointment reminder notifications 24h before',
  },
  async run() {
    // 1. Calculate tomorrows date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

    // 2. Find appointment ids scheduled for tomorrow
    const petRows = await db
      .select({ appointmentId: appointmentPets.appointmentId })
      .from(appointmentPets)
      .where(eq(appointmentPets.scheduledDate, tomorrowStr))
      .groupBy(appointmentPets.appointmentId);

    if (petRows.length === 0) {
      return { result: 'No appointments tomorrow' };
    }

    const appointmentIds = petRows.map((r) => r.appointmentId);

    // 3. Filter to active appointments that havent been reminded yet
    const eligibleAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          inArray(appointments.id, appointmentIds),
          inArray(appointments.status, ['pending', 'pending_documents', 'confirmed']),
          isNull(appointments.reminderSentAt),
          sql`${appointments.customerId} IS NOT NULL`,
        ),
      );

    // 4. Send reminders
    let sentCount = 0;
    for (const appt of eligibleAppointments) {
      try {
        await sendNotification({
          userId: appt.customerId!,
          category: 'appointment_reminder',
          title: 'Appointment Reminder',
          body: 'You have an appointment scheduled for tomorrow.',
        });

        await db
          .update(appointments)
          .set({ reminderSentAt: new Date() })
          .where(eq(appointments.id, appt.id));

        sentCount++;
      } catch (err) {
        console.error(`Reminder failed for appointment ${appt.id}:`, err);
      }
    }

    return { result: `Sent ${sentCount} reminders` };
  },
});
