/**
 * AI assisted with this file
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '~~/server/db';
import {
  appointmentPets,
  appointments,
  documentRequests,
  guestDetails,
  pets,
  users,
} from '~~/server/db/schema';
import {
  hashUploadToken,
  type IssuedUploadToken,
} from '~~/server/services/vaccination-hold.service';
import {
  renderBookingConfirmationEmail,
  renderHoldInitialEmail,
  renderHoldReleasedEmail,
  renderHoldReminderEmail,
} from '~~/server/utils/email-templates';

/* ─────────────────────────────────── *
 * Recipient & schedule lookup
 * ─────────────────────────────────── */

type Recipient = { email: string; name: string };

async function getRecipient(appointmentId: string): Promise<Recipient | null> {
  const [appt] = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appt) return null;

  if (appt.customerId) {
    const [u] = await db
      .select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, appt.customerId));

    if (u) return { email: u.email, name: u.firstName };
  }

  const [g] = await db
    .select({ email: guestDetails.email, firstName: guestDetails.firstName })
    .from(guestDetails)
    .where(eq(guestDetails.appointmentId, appointmentId));

  if (g) return { email: g.email, name: g.firstName };

  return null;
}

async function getEarliestSchedule(
  appointmentId: string,
): Promise<{ scheduledDate: string; startTime: string | null }> {
  const [first] = await db
    .select({
      scheduledDate: appointmentPets.scheduledDate,
      startTime: appointmentPets.startTime,
    })
    .from(appointmentPets)
    .where(eq(appointmentPets.appointmentId, appointmentId))
    .orderBy(asc(appointmentPets.scheduledDate), asc(appointmentPets.startTime))
    .limit(1);
  return {
    scheduledDate: first?.scheduledDate ?? '',
    startTime: first?.startTime ?? null,
  };
}

function buildUploadUrl(token: string): string {
  const { siteUrl } = useRuntimeConfig();
  return `${siteUrl.replace(/\/$/, '')}/upload/${token}`;
}

/* ─────────────────────────────────── *
 * Initial hold email
 * ─────────────────────────────────── */

/**
 * Sent right after a booking lands in pending_documents. Uses the
 * plaintext tokens returned by applyVaccinationHold — they are not
 * available again after this call.
 */
export async function sendVaccinationHoldEmail(
  appointmentId: string,
  tokens: IssuedUploadToken[],
): Promise<void> {
  if (tokens.length === 0) return;

  const recipient = await getRecipient(appointmentId);
  if (!recipient) {
    console.warn(`[vaccination-email] No recipient for appointment ${appointmentId}`);
    return;
  }

  const [appt] = await db
    .select({ documentsHoldExpiresAt: appointments.documentsHoldExpiresAt })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));
  if (!appt?.documentsHoldExpiresAt) return;

  const schedule = await getEarliestSchedule(appointmentId);
  const { subject, html } = renderHoldInitialEmail({
    recipientName: recipient.name,
    scheduledDate: schedule.scheduledDate,
    startTime: schedule.startTime,
    expiresAt: appt.documentsHoldExpiresAt,
    pets: tokens.map((t) => ({ name: t.displayName, uploadUrl: buildUploadUrl(t.token) })),
  });

  await sendEmail(recipient.email, subject, html);
}

/* ─────────────────────────────────── *
 * Reminder (50% window): rotates tokens
 * ─────────────────────────────────── */

/**
 * Issues fresh tokens for any pending+unused document_requests on
 * the appointment, sends the reminder email, and stamps the
 * appointment so subsequent runs don't double-send. Old tokens are
 * invalidated by overwriting the hash in place.
 */
export async function sendVaccinationReminderEmail(appointmentId: string): Promise<void> {
  const [appt] = await db
    .select({
      status: appointments.status,
      documentsHoldExpiresAt: appointments.documentsHoldExpiresAt,
      documentsReminderSentAt: appointments.documentsReminderSentAt,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appt || appt.status !== 'pending_documents' || !appt.documentsHoldExpiresAt) return;
  if (appt.documentsReminderSentAt) return;

  const recipient = await getRecipient(appointmentId);
  if (!recipient) return;

  const openRequests = await db
    .select({
      id: documentRequests.id,
      appointmentPetId: documentRequests.appointmentPetId,
      petId: documentRequests.petId,
    })
    .from(documentRequests)
    .where(
      and(
        eq(documentRequests.appointmentId, appointmentId),
        eq(documentRequests.status, 'pending'),
        isNull(documentRequests.usedAt),
      ),
    );

  if (openRequests.length === 0) return;

  // Rotate tokens in place; capture plaintext for the email body
  const issued: { name: string; uploadUrl: string }[] = [];
  for (const req of openRequests) {
    const fresh = randomUUID();

    let displayName = 'Pet';
    if (req.appointmentPetId) {
      const [ap] = await db
        .select({ guestPetName: appointmentPets.guestPetName, petId: appointmentPets.petId })
        .from(appointmentPets)
        .where(eq(appointmentPets.id, req.appointmentPetId));
      if (ap?.petId) {
        const [p] = await db.select({ name: pets.name }).from(pets).where(eq(pets.id, ap.petId));
        displayName = p?.name ?? displayName;
      } else if (ap?.guestPetName) {
        displayName = ap.guestPetName;
      }
    }

    await db
      .update(documentRequests)
      .set({ tokenHash: hashUploadToken(fresh) })
      .where(eq(documentRequests.id, req.id));

    issued.push({ name: displayName, uploadUrl: buildUploadUrl(fresh) });
  }

  const schedule = await getEarliestSchedule(appointmentId);
  const { subject, html } = renderHoldReminderEmail({
    recipientName: recipient.name,
    scheduledDate: schedule.scheduledDate,
    startTime: schedule.startTime,
    expiresAt: appt.documentsHoldExpiresAt,
    pets: issued,
  });

  await sendEmail(recipient.email, subject, html);

  await db
    .update(appointments)
    .set({ documentsReminderSentAt: new Date() })
    .where(eq(appointments.id, appointmentId));
}

/* ─────────────────────────────────── *
 * Released
 * ─────────────────────────────────── */

export async function sendVaccinationReleasedEmail(appointmentId: string): Promise<void> {
  const recipient = await getRecipient(appointmentId);
  if (!recipient) return;

  const schedule = await getEarliestSchedule(appointmentId);
  const { subject, html } = renderHoldReleasedEmail({
    recipientName: recipient.name,
    scheduledDate: schedule.scheduledDate,
    startTime: schedule.startTime,
  });

  await sendEmail(recipient.email, subject, html);
}

/* ─────────────────────────────────── *
 * Booking confirmation (after hold clears for guest)
 * ─────────────────────────────────── */

export async function sendBookingConfirmationEmail(appointmentId: string): Promise<void> {
  const recipient = await getRecipient(appointmentId);
  if (!recipient) return;

  const schedule = await getEarliestSchedule(appointmentId);
  const { subject, html } = renderBookingConfirmationEmail({
    recipientName: recipient.name,
    scheduledDate: schedule.scheduledDate,
    startTime: schedule.startTime,
  });

  await sendEmail(recipient.email, subject, html);
}
