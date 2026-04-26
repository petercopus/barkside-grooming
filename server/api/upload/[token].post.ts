/**
 * AI assisted with this file
 */
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { documentRequests, documents } from '~~/server/db/schema';
import { clearHoldIfSatisfied, hashUploadToken } from '~~/server/services/vaccination-hold.service';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '~~/shared/schemas/document';

/**
 * Public — token-driven upload endpoint. Validates the token, stores
 * the file, marks the document_request fulfilled (single-use), and
 * clears the appointment hold once all pets are satisfied.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')!;
  const tokenHash = hashUploadToken(token);

  const [req] = await db
    .select()
    .from(documentRequests)
    .where(eq(documentRequests.tokenHash, tokenHash));

  if (!req) {
    throw createError({ statusCode: 404, message: 'Upload link not found' });
  }
  if (req.usedAt) {
    throw createError({ statusCode: 409, message: 'Upload link has already been used' });
  }
  if (req.expiresAt && req.expiresAt < new Date()) {
    throw createError({ statusCode: 410, message: 'Upload link has expired' });
  }
  if (!req.appointmentId || !req.appointmentPetId) {
    throw createError({ statusCode: 500, message: 'Upload link is missing context' });
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

  const docId = crypto.randomUUID();
  const ownerSegment = req.targetUserId ?? 'guest';
  const key = `documents/${ownerSegment}/${docId}/${filePart.filename}`;
  const mimeType = filePart.type ?? 'application/octet-stream';

  await uploadFile(key, filePart.data, mimeType);
  try {
    await db.insert(documents).values({
      uploadedByUserId: req.targetUserId ?? null,
      petId: req.petId,
      appointmentId: req.appointmentId,
      documentRequestId: req.id,
      type: 'vaccination_record',
      filePath: key,
      fileName: filePart.filename,
      mimeType,
      status: 'pending',
    });

    await db
      .update(documentRequests)
      .set({ status: 'fulfilled', usedAt: new Date() })
      .where(eq(documentRequests.id, req.id));

    await clearHoldIfSatisfied(req.appointmentId);

    return { ok: true };
  } catch (err) {
    await deleteFile(key).catch(() => {});
    throw err;
  }
});
