import { boolean, integer, pgTable, serial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { appointments } from './appointments';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | authorized | captured | refunded | failed
  provider: varchar('provider', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cancellationPolicies = pgTable('cancellation_policies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  freeCancelHoursBefore: integer('free_cancel_hours_before').notNull(),
  lateCancelFeeCents: integer('late_cancel_fee_cents').notNull().default(0),
  noShowFeeCents: integer('no_show_fee_cents').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});
