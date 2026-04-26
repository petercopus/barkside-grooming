/**
 * AI assisted with this file
 */
import { and, eq, gt, inArray, isNull, lt } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '~~/server/db';
import { appointmentPets, appointments, documents, pets } from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';
import {
  sendVaccinationReleasedEmail,
  sendVaccinationReminderEmail,
} from '~~/server/services/vaccination-email.service';

/* ─────────────────────────────────── *
 * Constants
 * ─────────────────────────────────── */

const HOURS_GUEST = 24;
const HOURS_AUTH = 72;
const MIN_HOURS_BEFORE_APPT = 24;

export const SATISFYING_VAX_STATUSES = ['approved', 'pending'] as const;

/* ─────────────────────────────────── *
 * Pure helpers
 * ─────────────────────────────────── */

export function hashUploadToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Hold cap relative to appointment start: hold must end at least
 * 24h before the earliest scheduled pet so the slot can be released
 * in time. Guests get a flat 24h hold; logged-in users get 72h or
 * (appt - 24h), whichever is sooner.
 */
export function calcHoldExpiry(opts: {
  isGuest: boolean;
  earliestApptStart: Date;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  const baseHours = opts.isGuest ? HOURS_GUEST : HOURS_AUTH;
  const baseExpiry = new Date(now.getTime() + baseHours * 3600_000);

  if (opts.isGuest) return baseExpiry;

  const apptCap = new Date(opts.earliestApptStart.getTime() - MIN_HOURS_BEFORE_APPT * 3600_000);
  return baseExpiry < apptCap ? baseExpiry : apptCap;
}

/* ─────────────────────────────────── *
 * Token issued at booking time
 * ─────────────────────────────────── */

export type IssuedUploadToken = {
  appointmentPetId: string;
  displayName: string;
  token: string;
};

/* ─────────────────────────────────── *
 * Per-appointment vaccination assessment (db only)
 * ─────────────────────────────────── */

export type MissingPet = {
  appointmentPetId: string;
  petId: string | null;
  displayName: string;
};

/**
 * For each pet on the appointment, decide whether it has an
 * acceptable vaccination_record on file (status approved or pending).
 * Guest pets (no petId) always need to upload. Used outside any
 * transaction by clearHoldIfSatisfied and the upload-status endpoint;
 * booking endpoints inline the equivalent reads on `tx`.
 */
export async function assessVaccinationHold(appointmentId: string): Promise<MissingPet[]> {
  const apptPetRows = await db
    .select({
      id: appointmentPets.id,
      petId: appointmentPets.petId,
      guestPetName: appointmentPets.guestPetName,
    })
    .from(appointmentPets)
    .where(eq(appointmentPets.appointmentId, appointmentId));

  const registeredPetIds = apptPetRows
    .map((r) => r.petId)
    .filter((id): id is string => id !== null);

  const existingDocRows = registeredPetIds.length
    ? await db
        .select({ petId: documents.petId })
        .from(documents)
        .where(
          and(
            inArray(documents.petId, registeredPetIds),
            eq(documents.type, 'vaccination_record'),
            inArray(documents.status, [...SATISFYING_VAX_STATUSES]),
          ),
        )
    : [];

  const petsWithDocs = new Set(existingDocRows.map((r) => r.petId).filter(Boolean) as string[]);

  const petNameRows = registeredPetIds.length
    ? await db
        .select({ id: pets.id, name: pets.name })
        .from(pets)
        .where(inArray(pets.id, registeredPetIds))
    : [];
  const nameByPetId = new Map(petNameRows.map((p) => [p.id, p.name]));

  const missing: MissingPet[] = [];
  for (const ap of apptPetRows) {
    if (ap.petId === null) {
      missing.push({
        appointmentPetId: ap.id,
        petId: null,
        displayName: ap.guestPetName ?? 'Pet',
      });
      continue;
    }
    if (!petsWithDocs.has(ap.petId)) {
      missing.push({
        appointmentPetId: ap.id,
        petId: ap.petId,
        displayName: nameByPetId.get(ap.petId) ?? 'Pet',
      });
    }
  }
  return missing;
}

/* ─────────────────────────────────── *
 * Hold-clear after upload
 * ─────────────────────────────────── */

/**
 * Called from document upload paths after a vaccination_record is
 * attached to an appointment. If the appointment is in
 * pending_documents and no pets are still missing, transitions
 * to confirmed and clears the hold-expiry timestamp.
 */
export async function clearHoldIfSatisfied(appointmentId: string): Promise<void> {
  const [appt] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appt || appt.status !== 'pending_documents') return;

  const missing = await assessVaccinationHold(appointmentId);
  if (missing.length > 0) return;

  await db
    .update(appointments)
    .set({ status: 'confirmed', documentsHoldExpiresAt: null, updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  await db
    .update(appointmentPets)
    .set({ status: 'confirmed' })
    .where(eq(appointmentPets.appointmentId, appointmentId));
}

/* ─────────────────────────────────── *
 * Scheduled-task bodies
 * ─────────────────────────────────── */

/**
 * Cancel pending_documents appointments whose hold window has elapsed.
 * Returns the number of appointments released.
 */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
  const expired = await db
    .select({ id: appointments.id, customerId: appointments.customerId })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'pending_documents'),
        lt(appointments.documentsHoldExpiresAt, now),
      ),
    );

  if (expired.length === 0) return 0;

  let releasedCount = 0;
  for (const appt of expired) {
    try {
      await db
        .update(appointments)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(appointments.id, appt.id));
      await db
        .update(appointmentPets)
        .set({ status: 'cancelled' })
        .where(eq(appointmentPets.appointmentId, appt.id));

      await sendVaccinationReleasedEmail(appt.id).catch((err) =>
        console.error(`[release-holds] email failed for ${appt.id}:`, err),
      );

      if (appt.customerId) {
        await sendNotification({
          userId: appt.customerId,
          category: 'appointment_cancelled',
          title: 'Appointment Released',
          body: 'Your appointment was released because vaccination records were not received in time.',
        }).catch((err) => console.error(`[release-holds] notify failed for ${appt.id}:`, err));
      }

      releasedCount++;
    } catch (err) {
      console.error(`[release-holds] failed for ${appt.id}:`, err);
    }
  }

  return releasedCount;
}

/**
 * Send reminder email at ~50% of the document-hold window.
 * Returns the number of reminders sent.
 */
export async function sendVaccinationHoldReminders(now: Date = new Date()): Promise<number> {
  const candidates = await db
    .select({
      id: appointments.id,
      createdAt: appointments.createdAt,
      documentsHoldExpiresAt: appointments.documentsHoldExpiresAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'pending_documents'),
        isNull(appointments.documentsReminderSentAt),
        gt(appointments.documentsHoldExpiresAt, now),
      ),
    );

  if (candidates.length === 0) return 0;

  let sentCount = 0;
  for (const appt of candidates) {
    if (!appt.documentsHoldExpiresAt) continue;

    const midpoint = new Date(
      (appt.createdAt.getTime() + appt.documentsHoldExpiresAt.getTime()) / 2,
    );
    if (now < midpoint) continue;

    try {
      await sendVaccinationReminderEmail(appt.id);
      sentCount++;
    } catch (err) {
      console.error(`[hold-reminders] failed for ${appt.id}:`, err);
    }
  }

  return sentCount;
}
