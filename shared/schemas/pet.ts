import { z } from 'zod';

export const createPetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  breed: z.string().max(100).optional(), // TODO: serve breeds from prebuilt enum list
  weightLbs: z
    .number({ message: 'Weight is required' })
    .int()
    .min(1, 'Weight must be atleast 1 lb')
    .max(300, 'Weight must be 300 lbs or less'),
  dateOfBirth: z.iso.date().optional(),
  gender: z.enum(['male', 'female']).optional(),
  coatType: z.string().max(50).optional(),
  specialNotes: z.string().max(2000).optional(),
});

export const updatePetSchema = createPetSchema.partial();

export const createAdminPetSchema = createPetSchema.extend({
  ownerId: z.uuid('Owner is required'),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type CreateAdminPetInput = z.infer<typeof createAdminPetSchema>;
