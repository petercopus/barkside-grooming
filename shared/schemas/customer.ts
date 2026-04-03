import { z } from 'zod';

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.email().optional(),
  phone: z.string().max(50).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
