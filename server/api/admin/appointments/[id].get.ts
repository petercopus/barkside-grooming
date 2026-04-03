import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;

  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));

  if (!appointment) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  const [enriched] = await enrichAppointments([appointment]);

  return { appointment: enriched };
});
