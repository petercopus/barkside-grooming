import {
  date,
  integer,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '~~/server/db/schema/auth';
import { pets } from '~~/server/db/schema/pets';
import { bundles, services } from '~~/server/db/schema/services';

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | confirmed | in_progress | completed | cancelled | no_show
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentPets = pgTable('appointment_pets', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  petId: uuid('pet_id').references(() => pets.id, { onDelete: 'set null' }),
  guestPetName: varchar('guest_pet_name', { length: 100 }),
  guestPetBreed: varchar('guest_pet_breed', { length: 100 }),
  guestPetWeight: integer('guest_pet_weight'),
  guestPetSizeCategory: varchar('guest_pet_size_category', { length: 20 }),
  assignedGroomerId: uuid('assigned_groomer_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  scheduledDate: date('scheduled_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const appointmentServices = pgTable('appointment_services', {
  id: serial('id').primaryKey(),
  appointmentPetId: uuid('appointment_pet_id')
    .notNull()
    .references(() => appointmentPets.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
  priceAtBookingCents: integer('price_at_booking_cents').notNull(),
  durationAtBookingMinutes: integer('duration_at_booking_minutes').notNull(),
});

export const appointmentAddons = pgTable('appointment_addons', {
  id: serial('id').primaryKey(),
  appointmentPetId: uuid('appointment_pet_id')
    .notNull()
    .references(() => appointmentPets.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'set null' }),
  priceAtBookingCents: integer('price_at_booking_cents').notNull(),
});

export const appointmentBundles = pgTable('appointment_bundles', {
  id: serial('id').primaryKey(),
  appointmentPetId: uuid('appointment_pet_id')
    .notNull()
    .references(() => appointmentPets.id, { onDelete: 'cascade' }),
  bundleId: integer('bundle_id').references(() => bundles.id, { onDelete: 'set null' }),
  discountAppliedCents: integer('discount_applied_cents').notNull(),
});

export const guestDetails = pgTable('guest_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
});
