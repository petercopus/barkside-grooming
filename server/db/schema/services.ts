import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { petSizeCategories } from './pets';

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  isAddon: boolean('is_addon').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const servicePricing = pgTable('service_pricing', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  sizeCategoryId: integer('size_category_id')
    .notNull()
    .references(() => petSizeCategories.id, { onDelete: 'cascade' }),
  priceCents: integer('price_cents').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
});

export const bundles = pgTable('bundles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percent | fixed
  discountValue: integer('discount_value').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  startDate: date('start_date'),
  endDate: date('end_date'),
});

export const bundleServices = pgTable(
  'bundle_services',
  {
    bundleId: integer('bundle_id')
      .notNull()
      .references(() => bundles.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.bundleId, table.serviceId] })],
);
