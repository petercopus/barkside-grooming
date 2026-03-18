import { z } from 'zod';

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM or HH:MM:SS');

// Weekly schedule
export const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeString,
  endTime: timeString,
  isAvailable: z.boolean().default(true),
});

export const setWeeklyScheduleSchema = z.object({
  entries: z.array(scheduleEntrySchema),
});

// Schedule overrides
export const createOverrideSchema = z.object({
  date: z.string().date('Must be YYYY-MM-DD'),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
  isAvailable: z.boolean().default(false),
  reason: z.string().max(255).optional(),
});

export const updateOverrideSchema = createOverrideSchema.partial();

// Types
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
export type SetWeeklyScheduleInput = z.infer<typeof setWeeklyScheduleSchema>;
export type CreateOverrideInput = z.infer<typeof createOverrideSchema>;
export type UpdateOverrideInput = z.infer<typeof updateOverrideSchema>;
