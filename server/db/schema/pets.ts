import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '~~/server/db/schema/auth';

export const petSizeCategories = pgTable('pet_size_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  minWeight: integer('min_weight').notNull(),
  maxWeight: integer('max_weight').notNull(),
});

export const pets = pgTable('pets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  breed: varchar('breed', { length: 100 }),
  weightLbs: integer('weight_lbs'),
  sizeCategoryId: integer('size_category_id').references(() => petSizeCategories.id, {
    onDelete: 'set null',
  }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 50 }),
  coatType: varchar('coat_type', { length: 50 }),
  specialNotes: text('special_notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
