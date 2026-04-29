/**
 * AI assisted with this file
 */

import { between, count, eq, sql, sum } from 'drizzle-orm';
import { appointmentPets, appointmentServices, services } from '~~/server/db/schema';
import { brandChartSequence } from '../chart-colors';
import { defineReport } from '../types';
import { defaultEnd, defaultStart } from '../utils';

export default defineReport({
  id: 'top-services',
  name: 'Top Services',
  description: 'Most popular services by booking volume and revenue',
  category: 'Operations',
  permission: 'reports:view',

  filters: [
    { key: 'startDate', label: 'Start Date', type: 'date', required: true, default: defaultStart },
    { key: 'endDate', label: 'End Date', type: 'date', required: true, default: defaultEnd },
    { key: 'limit', label: 'Max Results', type: 'number', default: 10 },
  ],

  display: {
    type: 'chart+table',
    chart: { type: 'bar' },
  },

  async execute(db, filters) {
    const startDate = (filters.startDate as string) || defaultStart();
    const endDate = (filters.endDate as string) || defaultEnd();
    const limit = Number(filters.limit) || 10;

    const rows = await db
      .select({
        serviceName: services.name,
        bookings: count().as('bookings'),
        revenue: sum(appointmentServices.priceAtBookingCents).as('revenue'),
      })
      .from(appointmentServices)
      .innerJoin(appointmentPets, eq(appointmentServices.appointmentPetId, appointmentPets.id))
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(
        between(
          sql`${appointmentPets.scheduledDate}::date`,
          new Date(startDate),
          new Date(endDate),
        ),
      )
      .groupBy(services.name)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

    return {
      chart: {
        labels: rows.map((r) => r.serviceName),
        datasets: [
          {
            label: 'Bookings',
            data: rows.map((r) => Number(r.bookings)),
            backgroundColor: rows.map((_, i) => brandChartSequence[i % brandChartSequence.length]!),
          },
        ],
      },
      table: {
        columns: [
          { key: 'service', label: 'Service' },
          { key: 'bookings', label: 'Bookings', format: 'number' as const },
          { key: 'revenue', label: 'Revenue', format: 'currency' as const },
        ],
        rows: rows.map((r) => ({
          service: r.serviceName,
          bookings: Number(r.bookings),
          revenue: Number(r.revenue || 0) / 100,
        })),
      },
    };
  },
});
