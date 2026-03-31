import { z } from 'zod';

export const createBundleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(2000).optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().int().min(1, 'Discount must be atleast 1'),
  isActive: z.boolean().default(true),
  startDate: z.iso.date().optional().nullable(),
  endDate: z.iso.date().optional().nullable(),
  serviceIds: z.array(z.number().int().positive()).min(2, 'Atleast 2 services required'),
});

export const updateBundleSchema = createBundleSchema.partial();

// Types
export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
