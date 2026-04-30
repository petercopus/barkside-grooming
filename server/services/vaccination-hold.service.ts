/**
 * AI assisted with this file
 */
import { and, eq, gt, inArray, isNull, lt } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '~~/server/db';
import {
  appointmentPets,
  appointments,
  documentRequests,
  documents,
  pets,
} from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';
import {
  sendBookingConfirmationEmail,
  sendVaccinationReleasedEmail,
  sendVaccinationReminderEmail,
} from '~~/server/services/vaccination-email.service';
import { getAppointmentSchedule, getRecipientName } from '~~/server/utils/email-context';
import {
  renderAppointmentCancelledEmail,
  renderBookingConfirmationEmail,
} from '~~/server/utils/email-templates';

/* ─────────────────────────────────── *
 * Constants
 * ─────────────────────────────────── */

const HOURS_GUEST = 24;
const HOURS_AUTH = 72;
const MIN_HOURS_BEFORE_APPT = 24;
const MIN_HOLD_HOURS = 1;

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
 * (appt - 24h), whichever is sooner. A 1h floor keeps near-term
 * bookings from auto-cancelling before the customer can react.
 */
export function calcHoldExpiry(opts: {
  isGuest: boolean;
  earliestApptStart: Date;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  const baseHours = opts.isGuest ? HOURS_GUEST : HOURS_AUTH;
  const baseExpiry = new Date(now.getTime() + baseHours * 3600_000);
  const floor = new Date(now.getTime() + MIN_HOLD_HOURS * 3600_000);

  if (opts.isGuest) {
    return baseExpiry < floor ? floor : baseExpiry;
  }

  const apptCap = new Date(opts.earliestApptStart.getTime() - MIN_HOURS_BEFORE_APPT * 3600_000);
  const capped = baseExpiry < apptCap ? baseExpiry : apptCap;
  return capped < floor ? floor : capped;
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
 * Registered pets are satisfied via documents.petId; guest pets are
 * satisfied via the documentRequest issued for that appointmentPet.
 * Used outside any transaction by clearHoldIfSatisfied and the
 * upload-status endpoint; booking endpoints inline the equivalent
 * reads on `tx`.
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

  // Documents linked via documentRequest — satisfies guest appointmentPets
  // (which have no petId) and any registered pet whose upload came in
  // through a request rather than the generic upload endpoint.
  const requestSatisfiedRows = await db
    .select({ appointmentPetId: documentRequests.appointmentPetId })
    .from(documents)
    .innerJoin(documentRequests, eq(documents.documentRequestId, documentRequests.id))
    .where(
      and(
        eq(documentRequests.appointmentId, appointmentId),
        eq(documents.type, 'vaccination_record'),
        inArray(documents.status, [...SATISFYING_VAX_STATUSES]),
      ),
    );
  const apptPetIdsWithDocs = new Set(
    requestSatisfiedRows.map((r) => r.appointmentPetId).filter(Boolean) as string[],
  );

  const petNameRows = registeredPetIds.length
    ? await db
        .select({ id: pets.id, name: pets.name })
        .from(pets)
        .where(inArray(pets.id, registeredPetIds))
    : [];
  const nameByPetId = new Map(petNameRows.map((p) => [p.id, p.name]));

  const missing: MissingPet[] = [];
  for (const ap of apptPetRows) {
    const satisfiedByRequest = apptPetIdsWithDocs.has(ap.id);
    const satisfiedByPet = ap.petId !== null && petsWithDocs.has(ap.petId);
    if (satisfiedByRequest || satisfiedByPet) continue;

    missing.push({
      appointmentPetId: ap.id,
      petId: ap.petId,
      displayName:
        (ap.petId ? nameByPetId.get(ap.petId) : ap.guestPetName) ?? ap.guestPetName ?? 'Pet',
    });
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
 * to confirmed, clears the hold-expiry timestamp, and notifies the
 * customer (in-app + email for logged-in users; email-only for guests).
 */
export async function clearHoldIfSatisfied(appointmentId: string): Promise<void> {
  const [appt] = await db
    .select({ status: appointments.status, customerId: appointments.customerId })
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

  if (appt.customerId) {
    const recipientName = await getRecipientName(appt.customerId);
    const schedule = await getAppointmentSchedule(appointmentId);
    const { subject, html } = renderBookingConfirmationEmail({
      recipientName,
      scheduledDate: schedule.scheduledDate,
      startTime: schedule.startTime,
    });

    await sendNotification({
      userId: appt.customerId,
      category: 'appointment_confirmed',
      title: subject,
      body: 'Your appointment has been confirmed.',
      html,
    }).catch((err) => console.error(`[clear-hold] notify failed for ${appointmentId}:`, err));
  } else {
    await sendBookingConfirmationEmail(appointmentId).catch((err) =>
      console.error(`[clear-hold] guest confirmation email failed for ${appointmentId}:`, err),
    );
  }
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
        const recipientName = await getRecipientName(appt.customerId);
        const schedule = await getAppointmentSchedule(appt.id);
        const { html } = renderAppointmentCancelledEmail({
          recipientName,
          scheduledDate: schedule.scheduledDate,
          startTime: schedule.startTime,
        });
        await sendNotification({
          userId: appt.customerId,
          category: 'appointment_cancelled',
          title: 'Appointment Released',
          body: 'Your appointment was released because vaccination records were not received in time.',
          html,
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
