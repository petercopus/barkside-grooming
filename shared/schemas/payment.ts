import { z } from 'zod';

export const savePaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1),
});

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1).max(255),
  amountCents: z.number().int(),
  type: z.enum(['service', 'addon', 'bundle_discount', 'adjustment']),
});

export const updateInvoiceLineItemsSchema = z.object({
  lineItems: z.array(invoiceLineItemSchema).min(1),
});

export const checkoutSchema = z.object({
  tipCents: z.number().int().min(0).default(0),
});

export const refundSchema = z.object({
  amountCents: z.number().int().positive().optional(),
});

// Types
export type SavePaymentMethodInput = z.infer<typeof savePaymentMethodSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type UpdateInvoiceLineItemsInput = z.infer<typeof updateInvoiceLineItemsSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
