/**
 * AI assisted with this file
 */
import { and, eq, inArray } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '~~/server/db';
import { appointmentPets, appointments, notifications, users } from '~~/server/db/schema';
import { sendAppointmentReminders } from '~~/server/services/notification.service';

/* ─────────────────────────────────── *
 * Fixtures
 * ─────────────────────────────────── */

async function insertCustomer(): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `send-reminders-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: null,
      firstName: 'Reminder',
      lastName: 'Test',
    })
    .returning({ id: users.id });
  return u!.id;
}

async function insertAppointment(opts: {
  customerId: string | null;
  status: 'pending' | 'pending_documents' | 'confirmed' | 'cancelled' | 'completed';
  reminderSentAt: Date | null;
  scheduledDate: string;
  pets?: number; // default 1
}): Promise<string> {
  const [appt] = await db
    .insert(appointments)
    .values({
      customerId: opts.customerId,
      status: opts.status,
      reminderSentAt: opts.reminderSentAt,
    })
    .returning({ id: appointments.id });

  const petCount = opts.pets ?? 1;
  for (let i = 0; i < petCount; i++) {
    await db.insert(appointmentPets).values({
      appointmentId: appt!.id,
      petId: null,
      guestPetName: `Pet${i}`,
      scheduledDate: opts.scheduledDate,
      startTime: '10:00:00',
      endTime: '11:00:00',
      estimatedDurationMinutes: 60,
      status: 'pending',
    });
  }

  return appt!.id;
}

/**
 * Pin the calendar so the function's `tomorrow` calculation lands on
 * a date we control. Returns `now` and the matching tomorrow string.
 */
function pinTomorrow(): { now: Date; tomorrowStr: string } {
  // Use a fixed instant; tomorrow's ISO date is deterministic from it.
  const now = new Date('2099-06-15T12:00:00.000Z');
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { now, tomorrowStr: tomorrow.toISOString().split('T')[0]! };
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('sendAppointmentReminders', () => {
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

  it('does not pick up appointments scheduled for any day other than tomorrow', async () => {
    const { now } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    // Appointment two days from now — should not match.
    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      reminderSentAt: null,
      scheduledDate: '2099-06-17',
    });
    createdAppointmentIds.push(apptId);

    await sendAppointmentReminders(now);

    const [after] = await db
      .select({ stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('sends a reminder for a confirmed appointment scheduled tomorrow', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      reminderSentAt: null,
      scheduledDate: tomorrowStr,
    });
    createdAppointmentIds.push(apptId);

    await sendAppointmentReminders(now);

    const [after] = await db
      .select({ stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).not.toBeNull();

    const reminderRows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, customerId),
          eq(notifications.category, 'appointment_reminder'),
        ),
      );
    expect(reminderRows.length).toBeGreaterThanOrEqual(1);
  });

  it('skips appointments already stamped with reminderSentAt', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const initialStamp = new Date('2099-06-14T00:00:00.000Z');
    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      reminderSentAt: initialStamp,
      scheduledDate: tomorrowStr,
    });
    createdAppointmentIds.push(apptId);

    await sendAppointmentReminders(now);

    const [after] = await db
      .select({ stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp?.getTime()).toBe(initialStamp.getTime());
  });

  it('skips guest (customerId IS NULL) appointments', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const apptId = await insertAppointment({
      customerId: null,
      status: 'confirmed',
      reminderSentAt: null,
      scheduledDate: tomorrowStr,
    });
    createdAppointmentIds.push(apptId);

    await sendAppointmentReminders(now);

    const [after] = await db
      .select({ stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.stamp).toBeNull();
  });

  it('skips cancelled and completed appointments', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const cancelledId = await insertAppointment({
      customerId,
      status: 'cancelled',
      reminderSentAt: null,
      scheduledDate: tomorrowStr,
    });
    const completedId = await insertAppointment({
      customerId,
      status: 'completed',
      reminderSentAt: null,
      scheduledDate: tomorrowStr,
    });
    createdAppointmentIds.push(cancelledId, completedId);

    await sendAppointmentReminders(now);

    const stamps = await db
      .select({ id: appointments.id, stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(inArray(appointments.id, [cancelledId, completedId]));
    expect(stamps.every((r) => r.stamp === null)).toBe(true);
  });

  it('does not double-send when an appointment has multiple pets on the same day', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      reminderSentAt: null,
      scheduledDate: tomorrowStr,
      pets: 3,
    });
    createdAppointmentIds.push(apptId);

    await sendAppointmentReminders(now);

    // Default prefs: in_app + email per call. One appointment → exactly 2 notification rows.
    const reminderRows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, customerId),
          eq(notifications.category, 'appointment_reminder'),
        ),
      );
    expect(reminderRows).toHaveLength(2);
  });

  it('processes pending and pending_documents alongside confirmed', async () => {
    const { now, tomorrowStr } = pinTomorrow();
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);

    const ids = await Promise.all([
      insertAppointment({
        customerId,
        status: 'pending',
        reminderSentAt: null,
        scheduledDate: tomorrowStr,
      }),
      insertAppointment({
        customerId,
        status: 'pending_documents',
        reminderSentAt: null,
        scheduledDate: tomorrowStr,
      }),
      insertAppointment({
        customerId,
        status: 'confirmed',
        reminderSentAt: null,
        scheduledDate: tomorrowStr,
      }),
    ]);
    createdAppointmentIds.push(...ids);

    await sendAppointmentReminders(now);

    const stamps = await db
      .select({ id: appointments.id, stamp: appointments.reminderSentAt })
      .from(appointments)
      .where(inArray(appointments.id, ids));
    expect(stamps.every((r) => r.stamp !== null)).toBe(true);
  });
});
