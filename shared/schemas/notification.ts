import { z } from 'zod';

export const NOTIFICATION_CATEGORIES = [
  'welcome',
  'appointment_confirmed',
  'appointment_reminder',
  'appointment_cancelled',
  'appointment_status_changed',
  'admin_new_booking',
  'payment_refunded',
  'document_request',
] as const;

export const updatePreferencesSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  inappEnabled: z.boolean(),
});

// Types
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
