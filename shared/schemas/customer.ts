import { z } from 'zod';

export const createCustomerSchema = z.object({
  email: z.email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().min(1, 'First name required').max(255),
  lastName: z.string().min(1, 'Last name required').max(255),
  phone: z.string().max(50).optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.email().optional(),
  phone: z.string().max(50).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
