import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  phone: z.string().max(20).optional(),
  roleIds: z.array(z.number().int()).min(1, 'At least one role required'),
  isActive: z.boolean().default(true),
  serviceIds: z.array(z.number().int()).default([]),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.email().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.number().int()).optional(),
});

export const setEmployeeServicesSchema = z.object({
  serviceIds: z.array(z.number().int()),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
