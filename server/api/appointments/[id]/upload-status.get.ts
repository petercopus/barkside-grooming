import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments } from '~~/server/db/schema';
import { assessVaccinationHold } from '~~/server/services/vaccination-hold.service';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!;

  const [appt] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      documentsHoldExpiresAt: appointments.documentsHoldExpiresAt,
    })
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!appt) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  if (appt.status !== 'pending_documents') {
    return {
      status: appt.status,
      missingPets: [],
      holdExpiresAt: null,
    };
  }

  const missingPets = await assessVaccinationHold(appt.id);

  return {
    status: appt.status,
    missingPets,
    holdExpiresAt: appt.documentsHoldExpiresAt,
  };
});
