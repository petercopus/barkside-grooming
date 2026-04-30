import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments } from '~~/server/db/schema';
import { getInvoiceByAppointment } from '~~/server/services/invoice.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;

  const [appt] = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!appt || appt.customerId !== user.id) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  const invoice = await getInvoiceByAppointment(id);
  return { invoice };
});
