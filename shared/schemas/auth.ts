import { z } from 'zod';

// used by registration form and api call
export const registerSchema = z.object({
  email: z.email({ message: 'Enter a valid email' }),
  password: z
    .string({ message: 'Password is required' })
    .min(8, 'Password must be atleast 8 characters')
    .max(128),
  firstName: z.string({ message: 'First name is required' }).min(1).max(255),
  lastName: z.string({ message: 'Last name is required' }).min(1).max(255),
  phone: z.string().max(50).optional(),
});

// used by login form and api call
// only require len 1 so we dont leak pw rules on login
export const loginSchema = z.object({
  email: z.email({ message: 'Enter a valid email' }),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
