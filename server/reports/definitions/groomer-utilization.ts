/**
 * AI assisted with this file
 */

import { and, between, eq, inArray, notInArray, sql, sum } from 'drizzle-orm';
import { appointmentPets, employeeSchedules, users } from '~~/server/db/schema';
import { defineReport } from '../types';
import { defaultEnd, defaultStart } from '../utils';

export default defineReport({
  id: 'groomer-utilization',
  name: 'Groomer Utilization',
  description: 'Hours booked per groomer vs. available schedule hours',
  category: 'Staff',
  permission: 'reports:view',

  filters: [
    { key: 'startDate', label: 'Start Date', type: 'date', required: true, default: defaultStart },
    { key: 'endDate', label: 'End Date', type: 'date', required: true, default: defaultEnd },
  ],

  display: {
    type: 'kpi+table',
  },

  async execute(db, filters) {
    const startDate = (filters.startDate as string) || defaultStart();
    const endDate = (filters.endDate as string) || defaultEnd();

    // Run both queries in parallel — they are independent
    const [bookedRows, schedules] = await Promise.all([
      db
        .select({
          groomerId: appointmentPets.assignedGroomerId,
          groomerFirst: users.firstName,
          groomerLast: users.lastName,
          bookedMinutes: sum(appointmentPets.estimatedDurationMinutes).as('booked_minutes'),
        })
        .from(appointmentPets)
        .innerJoin(users, eq(appointmentPets.assignedGroomerId, users.id))
        .where(
          and(
            between(
              sql`${appointmentPets.scheduledDate}::date`,
              new Date(startDate),
              new Date(endDate),
            ),
            notInArray(appointmentPets.status, ['cancelled', 'no_show']),
          ),
        )
        .groupBy(appointmentPets.assignedGroomerId, users.firstName, users.lastName),

      db.select().from(employeeSchedules).where(eq(employeeSchedules.isAvailable, true)),
    ]);

    // Count occurrences of each day-of-week in the range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount: Record<number, number> = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      dayCount[dow] = (dayCount[dow] || 0) + 1;
    }

    // Sum available minutes per employee
    const availableMinutes: Record<string, number> = {};
    for (const sched of schedules) {
      const occurrences = dayCount[sched.dayOfWeek] || 0;
      const startParts = sched.startTime.split(':').map(Number);
      const endParts = sched.endTime.split(':').map(Number);
      const dailyMinutes =
        endParts[0]! * 60 + endParts[1]! - (startParts[0]! * 60 + startParts[1]!);
      availableMinutes[sched.userId] =
        (availableMinutes[sched.userId] || 0) + occurrences * dailyMinutes;
    }

    // Merge booked + available
    const groomerMap = new Map<
      string,
      { name: string; bookedMinutes: number; availableMinutes: number }
    >();

    for (const row of bookedRows) {
      if (!row.groomerId) continue;
      groomerMap.set(row.groomerId, {
        name: `${row.groomerFirst} ${row.groomerLast}`,
        bookedMinutes: Number(row.bookedMinutes) || 0,
        availableMinutes: availableMinutes[row.groomerId] || 0,
      });
    }

    // Batch-fetch names for employees with schedules but no bookings
    const missingIds = Object.keys(availableMinutes).filter((id) => !groomerMap.has(id));
    if (missingIds.length > 0) {
      const missingUsers = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, missingIds));

      for (const user of missingUsers) {
        groomerMap.set(user.id, {
          name: `${user.firstName} ${user.lastName}`,
          bookedMinutes: 0,
          availableMinutes: availableMinutes[user.id] || 0,
        });
      }
    }

    const results = Array.from(groomerMap.values()).sort(
      (a, b) => b.bookedMinutes - a.bookedMinutes,
    );

    const totalBooked = results.reduce((s, r) => s + r.bookedMinutes, 0);
    const totalAvailable = results.reduce((s, r) => s + r.availableMinutes, 0);
    const avgUtilization = totalAvailable > 0 ? (totalBooked / totalAvailable) * 100 : 0;

    return {
      kpis: [
        { label: 'Avg Utilization', value: `${avgUtilization.toFixed(1)}%` },
        { label: 'Total Booked Hours', value: (totalBooked / 60).toFixed(1) },
        { label: 'Total Available Hours', value: (totalAvailable / 60).toFixed(1) },
      ],
      table: {
        columns: [
          { key: 'groomer', label: 'Groomer' },
          { key: 'bookedHours', label: 'Booked Hours', format: 'number' as const },
          { key: 'availableHours', label: 'Available Hours', format: 'number' as const },
          { key: 'utilization', label: 'Utilization', format: 'percent' as const },
        ],
        rows: results.map((r) => ({
          groomer: r.name,
          bookedHours: Math.round((r.bookedMinutes / 60) * 10) / 10,
          availableHours: Math.round((r.availableMinutes / 60) * 10) / 10,
          utilization: r.availableMinutes > 0 ? (r.bookedMinutes / r.availableMinutes) * 100 : 0,
        })),
      },
    };
  },
});
