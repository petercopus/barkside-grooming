import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  isAddon: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateServiceSchema = createServiceSchema.partial();

// pricing entry per size
export const servicePricingSchema = z.object({
  sizeCategoryId: z.number().int(),
  priceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(1),
});

//
export const updateServicePricingSchema = z.object({
  pricing: z.array(servicePricingSchema),
});

// addon/service association
export const updateServiceAddonsSchema = z.object({
  baseServiceIds: z.array(z.number().int().positive()),
});

export const updateBaseServiceAddonsSchema = z.object({
  addonServiceIds: z.array(z.number().int().positive()),
});

// Types
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServicePricingInput = z.infer<typeof servicePricingSchema>;
export type UpdateServicePricingInput = z.infer<typeof updateServicePricingSchema>;
export type UpdateServiceAddonsInput = z.infer<typeof updateServiceAddonsSchema>;
export type UpdateBaseServiceAddonsInput = z.infer<typeof updateBaseServiceAddonsSchema>;
