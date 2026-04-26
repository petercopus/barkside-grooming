/**
 * AI assisted with this file
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments } from '~~/server/db/schema';
import { sendVaccinationReminderEmail } from '~~/server/services/vaccination-email.service';

export default defineTask({
  meta: {
    name: 'vaccination-hold-reminders',
    description: 'Send reminder email at ~50% of the document-hold window',
  },
  async run() {
    const now = new Date();

    const candidates = await db
      .select({
        id: appointments.id,
        createdAt: appointments.createdAt,
        documentsHoldExpiresAt: appointments.documentsHoldExpiresAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'pending_documents'),
          isNull(appointments.documentsReminderSentAt),
          gt(appointments.documentsHoldExpiresAt, now),
        ),
      );

    if (candidates.length === 0) {
      return { result: 'No appointments awaiting reminder' };
    }

    let sentCount = 0;
    for (const appt of candidates) {
      if (!appt.documentsHoldExpiresAt) continue;

      const midpoint = new Date(
        (appt.createdAt.getTime() + appt.documentsHoldExpiresAt.getTime()) / 2,
      );
      if (now < midpoint) continue;

      try {
        await sendVaccinationReminderEmail(appt.id);
        sentCount++;
      } catch (err) {
        console.error(`[hold-reminders] failed for ${appt.id}:`, err);
      }
    }

    return { result: `Sent ${sentCount} reminder(s)` };
  },
});
