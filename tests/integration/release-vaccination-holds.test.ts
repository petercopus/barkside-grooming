/**
 * AI assisted with this file
 */
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '~~/server/db';
import { appointmentPets, appointments, notifications, users } from '~~/server/db/schema';
import { releaseExpiredHolds } from '~~/server/services/vaccination-hold.service';

/* ─────────────────────────────────── *
 * Fixture helpers
 * ─────────────────────────────────── */

async function insertCustomer(): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `release-holds-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: null,
      firstName: 'Release',
      lastName: 'Test',
    })
    .returning({ id: users.id });
  return u!.id;
}

async function insertAppointment(opts: {
  customerId: string | null;
  status: 'pending_documents' | 'confirmed' | 'cancelled';
  documentsHoldExpiresAt: Date | null;
  scheduledDate: string;
}): Promise<string> {
  const [appt] = await db
    .insert(appointments)
    .values({
      customerId: opts.customerId,
      status: opts.status,
      documentsHoldExpiresAt: opts.documentsHoldExpiresAt,
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
    status: opts.status === 'pending_documents' ? 'pending' : opts.status,
  });

  return appt!.id;
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('releaseExpiredHolds', () => {
  const createdAppointmentIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (createdUserIds.length) {
      await db.delete(notifications).where(inArray(notifications.userId, createdUserIds));
    }
    if (createdAppointmentIds.length) {
      await db.delete(appointments).where(inArray(appointments.id, createdAppointmentIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdAppointmentIds.length = 0;
    createdUserIds.length = 0;
    vi.restoreAllMocks();
  });

  it('returns 0 when no appointments are in pending_documents', async () => {
    // Seed an unrelated confirmed appointment to make sure the query is filtered correctly
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      documentsHoldExpiresAt: null,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(new Date());

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('confirmed');
  });

  it('skips appointments whose hold has not yet expired', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const future = new Date(Date.now() + 2 * 3600_000); // 2h from now
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: future,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(new Date());

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('pending_documents');
  });

  it('cancels pending_documents appointment whose hold has expired', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const past = new Date(Date.now() - 3600_000); // 1h ago
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: past,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(new Date());

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('cancelled');

    const apptPets = await db
      .select({ status: appointmentPets.status })
      .from(appointmentPets)
      .where(eq(appointmentPets.appointmentId, apptId));
    expect(apptPets.every((p) => p.status === 'cancelled')).toBe(true);
  });

  it('writes an in_app notification for the customer when releasing', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const past = new Date(Date.now() - 3600_000);
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: past,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(new Date());

    const notes = await db
      .select({ category: notifications.category, type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, customerId));

    expect(notes.some((n) => n.category === 'appointment_cancelled' && n.type === 'in_app')).toBe(
      true,
    );
  });

  it('still releases the appointment when there is no customer (guest booking)', async () => {
    const past = new Date(Date.now() - 3600_000);
    const apptId = await insertAppointment({
      customerId: null,
      status: 'pending_documents',
      documentsHoldExpiresAt: past,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(new Date());

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('cancelled');
  });

  it('processes only expired holds, leaving fresh ones untouched', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const expiredId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(Date.now() - 3600_000),
      scheduledDate: '2099-01-01',
    });
    const freshId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(Date.now() + 3600_000),
      scheduledDate: '2099-01-02',
    });
    createdAppointmentIds.push(expiredId, freshId);

    await releaseExpiredHolds(new Date());

    const rows = await db
      .select({ id: appointments.id, status: appointments.status })
      .from(appointments)
      .where(inArray(appointments.id, [expiredId, freshId]));
    const byId = new Map(rows.map((r) => [r.id, r.status]));
    expect(byId.get(expiredId)).toBe('cancelled');
    expect(byId.get(freshId)).toBe('pending_documents');
  });

  it('uses the now argument when provided (overrides Date.now())', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    // Hold expires 5h in the real future, but we pass a clock 6h ahead → expired
    const expiresAt = new Date(Date.now() + 5 * 3600_000);
    const fakeNow = new Date(Date.now() + 6 * 3600_000);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: expiresAt,
      scheduledDate: '2099-01-01',
    });
    createdAppointmentIds.push(apptId);

    await releaseExpiredHolds(fakeNow);

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('cancelled');
  });
});
