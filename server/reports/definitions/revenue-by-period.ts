/**
 * AI assisted with this file
 */

import { and, between, eq, sql } from 'drizzle-orm';
import { payments } from '~~/server/db/schema';
import { defineReport } from '../types';
import { defaultEnd, defaultStart } from '../utils';

export default defineReport({
  id: 'revenue-by-period',
  name: 'Revenue by Period',
  description: 'Track revenue trends over time, grouped by day, week, or month',
  category: 'Financial',
  permission: 'reports:view',

  filters: [
    { key: 'startDate', label: 'Start Date', type: 'date', required: true, default: defaultStart },
    { key: 'endDate', label: 'End Date', type: 'date', required: true, default: defaultEnd },
    {
      key: 'groupBy',
      label: 'Group By',
      type: 'select',
      default: 'day',
      options: [
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
      ],
    },
  ],

  display: {
    type: 'kpi+chart+table',
    chart: { type: 'bar' },
  },

  async execute(db, filters) {
    const startDate = (filters.startDate as string) || defaultStart();
    const endDate = (filters.endDate as string) || defaultEnd();
    // Whitelist to prevent SQL injection — sql.raw() is used below
    const validGroups = ['day', 'week', 'month'] as const;
    const groupBy = validGroups.includes(filters.groupBy as any)
      ? (filters.groupBy as string)
      : 'day';
    const truncExpr = sql<string>`date_trunc(${sql.raw(`'${groupBy}'`)}, ${payments.createdAt})::date`;

    const rows = await db
      .select({
        period: truncExpr.as('period'),
        revenue: sql<number>`coalesce(sum(${payments.amountCents}), 0)`.as('revenue'),
        transactions: sql<number>`count(*)`.as('transactions'),
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, 'captured'),
          between(payments.createdAt, new Date(startDate), new Date(endDate + 'T23:59:59Z')),
        ),
      )
      .groupBy(truncExpr)
      .orderBy(truncExpr);

    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
    const totalTransactions = rows.reduce((sum, r) => sum + Number(r.transactions), 0);

    return {
      kpis: [
        { label: 'Total Revenue', value: `$${(totalRevenue / 100).toFixed(2)}` },
        { label: 'Transactions', value: totalTransactions },
        {
          label: 'Avg Transaction',
          value:
            totalTransactions > 0
              ? `$${(totalRevenue / totalTransactions / 100).toFixed(2)}`
              : '$0.00',
        },
      ],
      chart: {
        labels: rows.map((r) => r.period),
        datasets: [
          {
            label: 'Revenue ($)',
            data: rows.map((r) => Number(r.revenue) / 100),
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
        ],
      },
      table: {
        columns: [
          { key: 'period', label: 'Period', format: 'date' as const },
          { key: 'revenue', label: 'Revenue', format: 'currency' as const },
          { key: 'transactions', label: 'Transactions', format: 'number' as const },
        ],
        rows: rows.map((r) => ({
          period: r.period,
          revenue: Number(r.revenue) / 100,
          transactions: Number(r.transactions),
        })),
      },
    };
  },
});
