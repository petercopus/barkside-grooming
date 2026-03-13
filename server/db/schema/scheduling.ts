import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  serial,
  time,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { services } from './services';

export const employeeSchedules = pgTable('employee_schedules', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
});

export const scheduleOverrides = pgTable('schedule_overrides', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  isAvailable: boolean('is_available').notNull().default(false),
  reason: varchar('reason', { length: 255 }),
});

export const employeeServices = pgTable(
  'employee_services',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.serviceId] })],
);
