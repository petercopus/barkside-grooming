/**
 * AI assisted with this file
 */

import { between, count, sql } from 'drizzle-orm';
import { appointments } from '~~/server/db/schema';
import { defineReport } from '../types';
import { defaultEnd, defaultStart } from '../utils';

const statusColors: Record<string, string> = {
  completed: 'rgba(34, 197, 94, 0.7)',
  confirmed: 'rgba(59, 130, 246, 0.7)',
  pending: 'rgba(234, 179, 8, 0.7)',
  in_progress: 'rgba(168, 85, 247, 0.7)',
  cancelled: 'rgba(239, 68, 68, 0.7)',
  no_show: 'rgba(107, 114, 128, 0.7)',
};

export default defineReport({
  id: 'appointments-by-status',
  name: 'Appointments by Status',
  description: 'Breakdown of appointments by their current status',
  category: 'Operations',
  permission: 'reports:view',

  filters: [
    { key: 'startDate', label: 'Start Date', type: 'date', required: true, default: defaultStart },
    { key: 'endDate', label: 'End Date', type: 'date', required: true, default: defaultEnd },
  ],

  display: {
    type: 'chart+table',
    chart: { type: 'doughnut' },
  },

  async execute(db, filters) {
    const startDate = (filters.startDate as string) || defaultStart();
    const endDate = (filters.endDate as string) || defaultEnd();

    const rows = await db
      .select({
        status: appointments.status,
        count: count().as('count'),
      })
      .from(appointments)
      .where(between(appointments.createdAt, new Date(startDate), new Date(endDate + 'T23:59:59Z')))
      .groupBy(appointments.status)
      .orderBy(sql`count(*) desc`);

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return {
      chart: {
        labels: rows.map((r) => r.status),
        datasets: [
          {
            label: 'Appointments',
            data: rows.map((r) => Number(r.count)),
            backgroundColor: rows.map((r) => statusColors[r.status] || 'rgba(156, 163, 175, 0.7)'),
          },
        ],
      },
      table: {
        columns: [
          { key: 'status', label: 'Status' },
          { key: 'count', label: 'Count', format: 'number' as const },
          { key: 'percentage', label: '% of Total', format: 'percent' as const },
        ],
        rows: rows.map((r) => ({
          status: r.status,
          count: Number(r.count),
          percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
        })),
      },
    };
  },
});
