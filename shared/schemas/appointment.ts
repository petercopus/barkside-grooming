import { z } from 'zod';

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM or HH:MM:SS');

// one pet + services + slot selection
const bookingPetSchema = z.object({
  petId: z.uuid(),
  serviceIds: z.array(z.number().int().positive()).min(1, 'At least one service is required'),
  groomerId: z.uuid(),
  scheduledDate: z.iso.date('Must be YYYY-MM-DD'),
  startTime: timeString,
});

// full booking request
export const createBookingSchema = z.object({
  pets: z.array(bookingPetSchema).min(1, 'Atleast one pet is required'),
  notes: z.string().max(2000).optional(),
});

// appointment statuses
export const updateBookingStatusSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
});

// types
export type BookingPetInput = z.infer<typeof bookingPetSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
