import { and, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { documentRequests, documents, pets, users } from '~~/server/db/schema';
import type { UpdateDocumentStatusInput, UploadDocumentInput } from '~~/shared/schemas/document';

export async function uploadDocument(
  userId: string,
  input: UploadDocumentInput,
  file: { fileName: string; data: Buffer; mimeType: string },
) {
  const docId = crypto.randomUUID();
  const key = `documents/${userId}/${docId}/${file.fileName}`;

  await uploadFile(key, file.data, file.mimeType);

  const [document] = await db
    .insert(documents)
    .values({
      uploadedByUserId: userId,
      filePath: key,
      fileName: file.fileName,
      mimeType: file.mimeType,
      status: 'pending',
      petId: input.petId,
      appointmentId: input.appointmentId,
      documentRequestId: input.documentRequestId,
      type: input.type,
      notes: input.notes,
    })
    .returning();

  if (input.documentRequestId) {
    const [request] = await db
      .select()
      .from(documentRequests)
      .where(
        and(
          eq(documentRequests.id, input.documentRequestId),
          eq(documentRequests.targetUserId, userId),
          eq(documentRequests.status, 'pending'),
        ),
      );

    if (!request) {
      throw createError({
        statusCode: 400,
        message: 'Document request not found or already fulfilled',
      });
    }

    await db
      .update(documentRequests)
      .set({ status: 'fulfilled' })
      .where(eq(documentRequests.id, input.documentRequestId));
  }

  return document;
}

export async function listDocuments(userId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.uploadedByUserId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocument(docId: string, userId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.uploadedByUserId, userId)));

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Document not found' });
  }

  const url = await getPresignedUrl(doc.filePath);

  return { ...doc, url };
}

//#region ADMIN
export async function listAllDocuments(filters?: { status?: string; type?: string }) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(documents.status, filters.status));
  }

  if (filters?.type) {
    conditions.push(eq(documents.type, filters.type));
  }

  const docs = await db
    .select({
      id: documents.id,
      type: documents.type,
      fileName: documents.fileName,
      mimeType: documents.mimeType,
      status: documents.status,
      notes: documents.notes,
      createdAt: documents.createdAt,
      petId: documents.petId,
      petName: pets.name,
      uploadedByUserId: documents.uploadedByUserId,
      uploaderFirstName: users.firstName,
      uploaderLastName: users.lastName,
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploadedByUserId, users.id))
    .leftJoin(pets, eq(documents.petId, pets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documents.createdAt));

  return docs;
}

export async function getDocumentAdmin(docId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, docId));

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Document not found' });
  }

  const url = await getPresignedUrl(doc.filePath);

  return { ...doc, url };
}

export async function updateDocumentStatus(docId: string, input: UpdateDocumentStatusInput) {
  const [doc] = await db
    .update(documents)
    .set({
      status: input.status,
      notes: input.notes,
    })
    .where(eq(documents.id, docId))
    .returning();

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Failed to update document' });
  }

  return doc;
}

export async function deleteDocument(docId: string) {
  const [doc] = await db
    .select({ filePath: documents.filePath })
    .from(documents)
    .where(eq(documents.id, docId));

  if (!doc) {
    throw createError({ statusCode: 404, message: 'Failed to delete document' });
  }

  await deleteFile(doc.filePath);
  await db.delete(documents).where(eq(documents.id, docId));
}
//#endregion
