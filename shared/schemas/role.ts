import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.number().int()).default([]),
  defaultServiceIds: z.array(z.number().int()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.number().int()).optional(),
  defaultServiceIds: z.array(z.number().int()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
