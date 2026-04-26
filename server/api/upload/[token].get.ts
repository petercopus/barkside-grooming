/**
 * AI assisted with this file
 */
import { and, asc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, documentRequests, pets } from '~~/server/db/schema';
import { hashUploadToken } from '~~/server/services/vaccination-hold.service';

/**
 * Public — looks up an upload token (hashed) and returns enough
 * context for the upload page to render. Reports a state so the page
 * can branch to "expired" / "already used" without leaking other data.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')!;
  const tokenHash = hashUploadToken(token);

  const [req] = await db
    .select({
      id: documentRequests.id,
      appointmentId: documentRequests.appointmentId,
      appointmentPetId: documentRequests.appointmentPetId,
      petId: documentRequests.petId,
      expiresAt: documentRequests.expiresAt,
      usedAt: documentRequests.usedAt,
    })
    .from(documentRequests)
    .where(eq(documentRequests.tokenHash, tokenHash));

  if (!req) {
    throw createError({ statusCode: 404, message: 'Upload link not found' });
  }

  if (req.usedAt) return { state: 'used' as const };
  if (req.expiresAt && req.expiresAt < new Date()) return { state: 'expired' as const };
  if (!req.appointmentId || !req.appointmentPetId) {
    throw createError({ statusCode: 500, message: 'Upload link is missing context' });
  }

  // Pull pet name + schedule for display
  const [apptPet] = await db
    .select({
      id: appointmentPets.id,
      petId: appointmentPets.petId,
      guestPetName: appointmentPets.guestPetName,
      scheduledDate: appointmentPets.scheduledDate,
      startTime: appointmentPets.startTime,
    })
    .from(appointmentPets)
    .where(eq(appointmentPets.id, req.appointmentPetId))
    .orderBy(asc(appointmentPets.scheduledDate))
    .limit(1);

  let petName = apptPet?.guestPetName ?? 'Pet';
  if (apptPet?.petId) {
    const [p] = await db
      .select({ name: pets.name })
      .from(pets)
      .where(and(eq(pets.id, apptPet.petId)));
    if (p?.name) petName = p.name;
  }

  return {
    state: 'available' as const,
    petName,
    scheduledDate: apptPet?.scheduledDate ?? null,
    startTime: apptPet?.startTime ?? null,
    expiresAt: req.expiresAt,
  };
});
