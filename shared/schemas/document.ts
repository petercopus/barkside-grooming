import { z } from 'zod';

export const documentTypeEnum = z.enum(['vaccination_record', 'service_agreement', 'other']);

export const uploadDocumentSchema = z.object({
  petId: z.uuid().optional(),
  appointmentId: z.uuid().optional(),
  documentRequestId: z.uuid().optional(),
  type: documentTypeEnum,
  notes: z.string().max(2000).optional(),
});

export const updateDocumentStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional(),
});

export const createDocumentRequestSchema = z.object({
  targetUserId: z.uuid(),
  petId: z.uuid().optional(),
  type: documentTypeEnum,
  message: z.string().max(2000).optional(),
  dueDate: z.iso.date().optional(),
});

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Types
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentStatusInput = z.infer<typeof updateDocumentStatusSchema>;
export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>;
