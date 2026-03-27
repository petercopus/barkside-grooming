import { z } from 'zod';

export const createSizeCategorySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    minWeight: z.number().int().min(0, 'Min weight must be >= 0'),
    maxWeight: z.number().int().min(1, 'Max weight must be >= 1'),
  })
  .refine((data) => data.maxWeight > data.minWeight, {
    message: 'Max weight must be greater than min weight',
    path: ['maxWeight'],
  });

export const updateSizeCategorySchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50).optional(),
    minWeight: z.number().int().min(0).optional(),
    maxWeight: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.minWeight != null && data.maxWeight != null) {
        return data.maxWeight > data.minWeight;
      }
      return true;
    },
    {
      message: 'Max weight must be greater than min weight',
      path: ['maxWeight'],
    },
  );

export type CreateSizeCategoryInput = z.infer<typeof createSizeCategorySchema>;
export type UpdateSizeCategoryInput = z.infer<typeof updateSizeCategorySchema>;
