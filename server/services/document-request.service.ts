import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '~~/server/db';
import { documentRequests, pets, users } from '~~/server/db/schema';
import type { CreateDocumentRequestInput } from '~~/shared/schemas/document';

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
      targetFirstName: target.firstName,
      targetLastName: target.lastName,
      requesterFirstName: requester.firstName,
      requesterLastName: requester.lastName,
    })
    .from(documentRequests)
    .leftJoin(requester, eq(documentRequests.requestedByUserId, requester.id))
    .leftJoin(target, eq(documentRequests.targetUserId, target.id))
    .leftJoin(pets, eq(documentRequests.petId, pets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documentRequests.createdAt));

  return requests;
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
