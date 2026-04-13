import { boolean, integer, pgTable, serial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { appointments } from './appointments';
import { users } from './auth';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | authorized | captured | refunded | failed
  provider: varchar('provider', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  tipCents: integer('tip_cents').notNull().default(0),
  paymentMethodId: varchar('payment_method_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  tipCents: integer('tip_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: serial('id').primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  type: varchar('type', { length: 20 }).notNull().default('service'),
});

export const customerPaymentMethods = pgTable('customer_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 50 }).notNull(),
  last4: varchar('last4', { length: 4 }).notNull(),
  expMonth: integer('exp_month').notNull(),
  expYear: integer('exp_year').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
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
