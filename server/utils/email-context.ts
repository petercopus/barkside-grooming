import { asc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, users } from '~~/server/db/schema';

/* ─────────────────────────────────── *
 * Lookup helpers shared by email render call sites
 * ─────────────────────────────────── */
export async function getRecipientName(userId: string): Promise<string> {
  const [u] = await db
    .select({ firstName: users.firstName })
    .from(users)
    .where(eq(users.id, userId));

  return u?.firstName ?? 'there';
}

export async function getAppointmentSchedule(
  appointmentId: string,
): Promise<{ scheduledDate: string; startTime: string | null }> {
  const [first] = await db
    .select({
      scheduledDate: appointmentPets.scheduledDate,
      startTime: appointmentPets.startTime,
    })
    .from(appointmentPets)
    .where(eq(appointmentPets.appointmentId, appointmentId))
    .orderBy(asc(appointmentPets.scheduledDate), asc(appointmentPets.startTime))
    .limit(1);

  return {
    scheduledDate: first?.scheduledDate ?? '',
    startTime: first?.startTime ?? null,
  };
}
