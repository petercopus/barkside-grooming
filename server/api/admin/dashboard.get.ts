import { and, between, count, desc, eq, inArray, sum } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments, payments } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';
import { todayDateString } from '~~/shared/utils/date';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:access');

  const now = new Date();
  const today = todayDateString();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // date lives on appointmentPets, not appointments
  async function loadTodaysAppointments() {
    const idRows = await db
      .selectDistinct({ id: appointmentPets.appointmentId })
      .from(appointmentPets)
      .where(eq(appointmentPets.scheduledDate, today));
    if (idRows.length === 0) return [];
    const apptRows = await db
      .select()
      .from(appointments)
      .where(
        inArray(
          appointments.id,
          idRows.map((r) => r.id),
        ),
      );
    const enriched = await enrichAppointments(apptRows);
    enriched.sort((a, b) => (a.pets[0]?.startTime ?? '').localeCompare(b.pets[0]?.startTime ?? ''));
    return enriched;
  }

  async function loadRecentActivity() {
    const apptRows = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt))
      .limit(5);
    return enrichAppointments(apptRows);
  }

  const [todaysAppointments, pendingRow, weekRevenueRow, weekNoShowRow, recentActivity] =
    await Promise.all([
      loadTodaysAppointments(),
      db
        .select({ value: count() })
        .from(appointments)
        .where(inArray(appointments.status, ['pending', 'pending_documents']))
        .then((rows) => rows[0]),
      db
        .select({ value: sum(payments.amountCents) })
        .from(payments)
        .where(and(eq(payments.status, 'captured'), between(payments.createdAt, weekStart, now)))
        .then((rows) => rows[0]),
      db
        .select({ value: count() })
        .from(appointments)
        .where(
          and(eq(appointments.status, 'no_show'), between(appointments.updatedAt, weekStart, now)),
        )
        .then((rows) => rows[0]),
      loadRecentActivity(),
    ]);

  return {
    kpis: {
      todayBookings: todaysAppointments.length,
      pendingConfirmations: Number(pendingRow?.value ?? 0),
      weekRevenueCents: Number(weekRevenueRow?.value ?? 0),
      weekNoShows: Number(weekNoShowRow?.value ?? 0),
    },
    todaysAppointments,
    recentActivity,
  };
});
