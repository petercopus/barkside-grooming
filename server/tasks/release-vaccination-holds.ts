/**
 * AI assisted with this file
 */
import { and, eq, lt } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments } from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';
import { sendVaccinationReleasedEmail } from '~~/server/services/vaccination-email.service';

export default defineTask({
  meta: {
    name: 'release-vaccination-holds',
    description: 'Cancel pending_documents appointments whose hold window has elapsed',
  },
  async run() {
    const now = new Date();

    const expired = await db
      .select({ id: appointments.id, customerId: appointments.customerId })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'pending_documents'),
          lt(appointments.documentsHoldExpiresAt, now),
        ),
      );

    if (expired.length === 0) {
      return { result: 'No expired holds' };
    }

    let releasedCount = 0;
    for (const appt of expired) {
      try {
        await db
          .update(appointments)
          .set({ status: 'cancelled', updatedAt: now })
          .where(eq(appointments.id, appt.id));
        await db
          .update(appointmentPets)
          .set({ status: 'cancelled' })
          .where(eq(appointmentPets.appointmentId, appt.id));

        await sendVaccinationReleasedEmail(appt.id).catch((err) =>
          console.error(`[release-holds] email failed for ${appt.id}:`, err),
        );

        if (appt.customerId) {
          await sendNotification({
            userId: appt.customerId,
            category: 'appointment_cancelled',
            title: 'Appointment Released',
            body: 'Your appointment was released because vaccination records were not received in time.',
          }).catch((err) => console.error(`[release-holds] notify failed for ${appt.id}:`, err));
        }

        releasedCount++;
      } catch (err) {
        console.error(`[release-holds] failed for ${appt.id}:`, err);
      }
    }

    return { result: `Released ${releasedCount} appointment(s)` };
  },
});
