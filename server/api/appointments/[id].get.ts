import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;

  const [row] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.customerId, user.id)));

  if (!row) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  const [appointment] = await enrichAppointments([row]);
  return { appointment };
});
