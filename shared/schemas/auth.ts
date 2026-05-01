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

// auth'd user password change
export const changePasswordSchema = z.object({
  currentPassword: z.string({ message: 'Current password is required' }).min(1),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'Password must be atleast 8 characters')
    .max(128),
});

// request a password reset email
export const forgotPasswordSchema = z.object({
  email: z.email({ message: 'Enter a valid email' }),
});

// reset password
export const resetPasswordSchema = z.object({
  token: z.string({ message: 'Reset token is required' }).min(1),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(8, 'Password must be atleast 8 characters')
    .max(128),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
