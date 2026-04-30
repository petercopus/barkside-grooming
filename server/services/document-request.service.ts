import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '~~/server/db';
import { documentRequests, pets, users } from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';
import { getRecipientName } from '~~/server/utils/email-context';
import { renderDocumentRequestEmail } from '~~/server/utils/email-templates';
import type { CreateDocumentRequestInput } from '~~/shared/schemas/document';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  vaccination_record: 'vaccination record',
  service_agreement: 'service agreement',
  other: 'document',
};

export async function createDocumentRequest(
  requestedByUserId: string,
  input: CreateDocumentRequestInput,
) {
  const [user] = await db.select().from(users).where(eq(users.id, input.targetUserId));

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' });
  }

  if (input.petId) {
    const [pet] = await db
      .select()
      .from(pets)
      .where(and(eq(pets.id, input.petId), eq(pets.ownerId, input.targetUserId)));

    if (!pet) {
      throw createError({ statusCode: 400, message: 'Pet does not belong to this user' });
    }
  }

  const [request] = await db
    .insert(documentRequests)
    .values({
      requestedByUserId,
      targetUserId: input.targetUserId,
      petId: input.petId,
      documentType: input.type,
      message: input.message,
      dueDate: input.dueDate,
    })
    .returning();

  const documentTypeLabel = DOCUMENT_TYPE_LABELS[input.type] ?? 'document';
  const recipientName = await getRecipientName(input.targetUserId);

  let petName: string | null = null;
  if (input.petId) {
    const [petRow] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(eq(pets.id, input.petId));
    petName = petRow?.name ?? null;
  }

  const { subject, html } = renderDocumentRequestEmail({
    recipientName,
    documentTypeLabel,
    petName,
    message: input.message ?? null,
    dueDate: input.dueDate ?? null,
  });

  try {
    await sendNotification({
      userId: input.targetUserId,
      category: 'document_request',
      title: subject,
      body: `We've requested a ${documentTypeLabel} from you.`,
      html,
    });
  } catch (err) {
    console.error('Failed to send document request notification:', err);
  }

  return request;
}

export async function listDocumentRequests(userId: string) {
  return db
    .select({
      id: documentRequests.id,
      documentType: documentRequests.documentType,
      message: documentRequests.message,
      status: documentRequests.status,
      dueDate: documentRequests.dueDate,
      createdAt: documentRequests.createdAt,
      petId: documentRequests.petId,
      petName: pets.name,
      requestedByFirstName: users.firstName,
      requestedByLastName: users.lastName,
    })
    .from(documentRequests)
    .leftJoin(users, eq(documentRequests.requestedByUserId, users.id))
    .leftJoin(pets, eq(documentRequests.petId, pets.id))
    .where(and(eq(documentRequests.targetUserId, userId), eq(documentRequests.status, 'pending')))
    .orderBy(asc(documentRequests.dueDate), desc(documentRequests.createdAt));
}

export async function listAllDocumentRequests(filters?: { status?: string }) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(documentRequests.status, filters.status));
  }

  const requester = alias(users, 'requester');
  const target = alias(users, 'target');

  const requests = await db
    .select({
      id: documentRequests.id,
      documentType: documentRequests.documentType,
      message: documentRequests.message,
      status: documentRequests.status,
      dueDate: documentRequests.dueDate,
      createdAt: documentRequests.createdAt,
      petId: documentRequests.petId,
      petName: pets.name,
      petBreed: pets.breed,
      targetId: target.id,
      targetFirstName: target.firstName,
      targetLastName: target.lastName,
      targetPhone: target.phone,
      requesterId: requester.id,
      requesterFirstName: requester.firstName,
      requesterLastName: requester.lastName,
    })
    .from(documentRequests)
    .leftJoin(requester, eq(documentRequests.requestedByUserId, requester.id))
    .leftJoin(target, eq(documentRequests.targetUserId, target.id))
    .leftJoin(pets, eq(documentRequests.petId, pets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documentRequests.createdAt));

  return requests.map((req) => ({
    ...req,
    targetName: formatFullName(req.targetFirstName, req.targetLastName),
    requesterName: formatFullName(req.requesterFirstName, req.requesterLastName),
  }));
}

export async function getDocumentRequest(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(documentRequests)
    .where(and(eq(documentRequests.id, requestId), eq(documentRequests.targetUserId, userId)));

  if (!request) {
    throw createError({ statusCode: 404, message: 'Document request not found' });
  }

  return request;
}
