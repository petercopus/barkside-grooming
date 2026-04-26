import { date, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { appointmentPets, appointments } from './appointments';
import { users } from './auth';
import { pets } from './pets';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  petId: uuid('pet_id').references(() => pets.id, { onDelete: 'set null' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  documentRequestId: uuid('document_request_id').references(() => documentRequests.id, {
    onDelete: 'set null',
  }),
  type: varchar('type', { length: 50 }).notNull(), // vaccination_record | service_agreement | other
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending | approved | rejected
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentRequests = pgTable(
  'document_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'cascade' }),
    petId: uuid('pet_id').references(() => pets.id, { onDelete: 'set null' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'cascade',
    }),
    appointmentPetId: uuid('appointment_pet_id').references(() => appointmentPets.id, {
      onDelete: 'cascade',
    }),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    message: text('message'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | fulfilled | expired
    dueDate: date('due_date'),
    tokenHash: varchar('token_hash', { length: 64 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('document_requests_token_hash_uniq').on(t.tokenHash)],
);
