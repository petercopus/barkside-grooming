import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments, documents } from '~~/server/db/schema';
import { clearHoldIfSatisfied } from '~~/server/services/vaccination-hold.service';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~~/shared/schemas/document';

export default defineEventHandler(async (event) => {
  const appointmentId = getRouterParam(event, 'id')!;

  const [appt] = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appt) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }
  if (appt.status !== 'pending_documents') {
    throw createError({ statusCode: 409, message: 'Appointment is not awaiting documents' });
  }

  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No form data provided' });
  }

  const filePart = formData.find((part) => part.filename);
  if (!filePart || !filePart.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'No file provided' });
  }

  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'File exceeds size limit' });
  }
  if (!ALLOWED_MIME_TYPES.includes(filePart.type ?? '')) {
    throw createError({ statusCode: 400, message: 'File type not allowed' });
  }

  const metadata: Record<string, string> = {};
  for (const part of formData) {
    if (!part.filename && part.name) {
      metadata[part.name] = part.data.toString('utf-8');
    }
  }

  const appointmentPetId = metadata.appointmentPetId;
  if (!appointmentPetId) {
    throw createError({ statusCode: 400, message: 'appointmentPetId is required' });
  }

  const [apptPet] = await db
    .select({ id: appointmentPets.id, petId: appointmentPets.petId })
    .from(appointmentPets)
    .where(
      and(
        eq(appointmentPets.id, appointmentPetId),
        eq(appointmentPets.appointmentId, appointmentId),
      ),
    );

  if (!apptPet) {
    throw createError({ statusCode: 400, message: 'Pet does not belong to this appointment' });
  }

  const userId = event.context.user?.id ?? null;
  const docId = crypto.randomUUID();
  const ownerSegment = userId ?? 'guest';
  const key = `documents/${ownerSegment}/${docId}/${filePart.filename}`;
  const mimeType = filePart.type ?? 'application/octet-stream';

  await uploadFile(key, filePart.data, mimeType);
  try {
    const [document] = await db
      .insert(documents)
      .values({
        uploadedByUserId: userId,
        petId: apptPet.petId,
        appointmentId,
        type: 'vaccination_record',
        filePath: key,
        fileName: filePart.filename,
        mimeType,
        status: 'pending',
      })
      .returning();

    await clearHoldIfSatisfied(appointmentId);

    return { document };
  } catch (err) {
    await deleteFile(key).catch(() => {});
    throw err;
  }
});
