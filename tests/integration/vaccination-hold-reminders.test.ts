/**
 * AI assisted with this file
 */
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '~~/server/db';
import { appointmentPets, appointments, documentRequests, users } from '~~/server/db/schema';
import { sendVaccinationHoldReminders } from '~~/server/services/vaccination-hold.service';

/* ─────────────────────────────────── *
 * Fixtures
 * ─────────────────────────────────── */

async function insertCustomer(): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `hold-reminder-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: null,
      firstName: 'Hold',
      lastName: 'Reminder',
    })
    .returning({ id: users.id });
  return u!.id;
}

/**
 * Insert an appointment with full control over the timestamps the
 * reminder query hinges on. `createdAt` matters because the midpoint
 * is (createdAt + holdExpiresAt) / 2.
 */
async function insertAppointment(opts: {
  customerId: string | null;
  status: 'pending' | 'pending_documents' | 'confirmed' | 'cancelled';
  documentsHoldExpiresAt: Date | null;
  documentsReminderSentAt: Date | null;
  createdAt: Date;
  scheduledDate: string;
}): Promise<string> {
  const [appt] = await db
    .insert(appointments)
    .values({
      customerId: opts.customerId,
      status: opts.status,
      documentsHoldExpiresAt: opts.documentsHoldExpiresAt,
      documentsReminderSentAt: opts.documentsReminderSentAt,
      createdAt: opts.createdAt,
    })
    .returning({ id: appointments.id });

  await db.insert(appointmentPets).values({
    appointmentId: appt!.id,
    petId: null,
    guestPetName: 'TestPet',
    scheduledDate: opts.scheduledDate,
    startTime: '10:00:00',
    endTime: '11:00:00',
    estimatedDurationMinutes: 60,
    status: 'pending',
  });

  return appt!.id;
}

/**
 * Insert a pending document_request for the given appointment so the
 * inner `sendVaccinationReminderEmail` exercises the full stamping path
 * rather than no-op'ing on an empty open-request list.
 */
async function insertOpenDocRequest(appointmentId: string): Promise<void> {
  const [appt] = await db
    .select({ pet: appointmentPets.id })
    .from(appointmentPets)
    .where(eq(appointmentPets.appointmentId, appointmentId))
    .limit(1);

  await db.insert(documentRequests).values({
    appointmentId,
    appointmentPetId: appt?.pet ?? null,
    documentType: 'vaccination_record',
    status: 'pending',
    tokenHash: `hash-${Math.random().toString(36).slice(2)}`,
  });
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('sendVaccinationHoldReminders', () => {
  const createdAppointmentIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (createdAppointmentIds.length) {
      // documentRequests cascade on appointment delete
      await db.delete(appointments).where(inArray(appointments.id, createdAppointmentIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdAppointmentIds.length = 0;
    createdUserIds.length = 0;
    vi.restoreAllMocks();
  });

  it('does not pick up appointments that are not in pending_documents', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      documentsHoldExpiresAt: null,
      documentsReminderSentAt: null,
      createdAt: new Date(),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await sendVaccinationHoldReminders(new Date());

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('skips appointments where documentsReminderSentAt is already set', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    const initialStamp = new Date(now.getTime() - 60_000);
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      // hold expires far enough in the future that midpoint is in the past
      documentsHoldExpiresAt: new Date(now.getTime() + 10 * 3600_000),
      documentsReminderSentAt: initialStamp,
      createdAt: new Date(now.getTime() - 50 * 3600_000),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await sendVaccinationHoldReminders(now);

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp?.getTime()).toBe(initialStamp.getTime());
  });

  it('skips appointments where the hold has already expired', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() - 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 2 * 3600_000),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await sendVaccinationHoldReminders(now);

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('skips appointments where now is before the (createdAt, holdExpiresAt) midpoint', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    // createdAt = now - 1h, expires at now + 10h → midpoint = now + 4.5h, far ahead of now
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() + 10 * 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 3600_000),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await sendVaccinationHoldReminders(now);

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('sends reminder when now is past the midpoint', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    // createdAt = now - 30h, expires at now + 1h → midpoint = now - 14.5h (past)
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() + 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 30 * 3600_000),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);
    await insertOpenDocRequest(apptId);

    await sendVaccinationHoldReminders(now);

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).not.toBeNull();
  });

  it('does not stamp the appointment when there are no open document_requests', async () => {
    // The inner sendVaccinationReminderEmail returns early when openRequests
    // is empty, so the appointment must remain unstamped.
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() + 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 30 * 3600_000),
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await sendVaccinationHoldReminders(now);

    const [after] = await db
      .select({ stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('processes multiple eligible appointments in a single run', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const now = new Date();
    const a1 = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() + 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 30 * 3600_000),
      scheduledDate: '2099-01-01',
    });
    const a2 = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(now.getTime() + 2 * 3600_000),
      documentsReminderSentAt: null,
      createdAt: new Date(now.getTime() - 40 * 3600_000),
      scheduledDate: '2099-01-02',
    });
    createdAppointmentIds.push(a1, a2);
    await insertOpenDocRequest(a1);
    await insertOpenDocRequest(a2);

    await sendVaccinationHoldReminders(now);

    const stamps = await db
      .select({ id: appointments.id, stamp: appointments.documentsReminderSentAt })
      .from(appointments)
      .where(inArray(appointments.id, [a1, a2]));
    const byId = new Map(stamps.map((r) => [r.id, r.stamp]));
    expect(byId.get(a1)).not.toBeNull();
    expect(byId.get(a2)).not.toBeNull();
  });
});
