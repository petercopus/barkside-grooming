import { z } from 'zod';

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM or HH:MM:SS');

// one pet + services + slot selection
const bookingPetSchema = z.object({
  petId: z.uuid(),
  serviceIds: z.array(z.number().int().positive()).min(1, 'At least one service is required'),
  addonIds: z.array(z.number().int().positive()).optional().default([]),
  bundleId: z.number().int().positive().optional(),
  discountAppliedCents: z.number().int().min(0).optional(),
  groomerId: z.uuid(),
  scheduledDate: z.iso.date('Must be YYYY-MM-DD'),
  startTime: timeString,
});

// full booking request
export const createBookingSchema = z.object({
  pets: z.array(bookingPetSchema).min(1, 'Atleast one pet is required'),
  notes: z.string().max(2000).optional(),
  paymentMethodId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
});

// appointment statuses
export const updateBookingStatusSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
});

// Guest booking
const guestPetSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(100),
  breed: z.string().max(100).optional(),
  weightLbs: z.number().int().min(1, 'Weight is required for pricing').max(300),
});

const guestDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email().max(255),
  phone: z.string().min(1, 'Phone is required').max(50),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
});

export const createGuestBookingSchema = z.object({
  pet: guestPetSchema.extend({
    serviceIds: z.array(z.number().int().positive()).min(1, 'At least one service is required'),
    addonIds: z.array(z.number().int().positive()).optional().default([]),
    bundleId: z.number().int().positive().optional(),
    discountAppliedCents: z.number().int().min(0).optional(),
    groomerId: z.uuid(),
    scheduledDate: z.iso.date('Must be YYYY-MM-DD'),
    startTime: timeString,
  }),
  guestDetails: guestDetailsSchema,
  notes: z.string().max(2000).optional(),
  paymentMethodId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
});

// types
export type BookingPetInput = z.infer<typeof bookingPetSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>;
export type CreateGuestBookingInput = z.infer<typeof createGuestBookingSchema>;
