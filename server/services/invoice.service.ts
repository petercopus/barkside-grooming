import { asc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments, invoiceLineItems, invoices, payments } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';
import type { InvoiceLineItemInput } from '~~/shared/schemas/payment';

/**
 * Subtotal (positive amounts), discount (absolute of negatives), total (subtotal − discount) for a set of line items.
 */
export function calcInvoiceTotals(lineItems: { amountCents: number }[]) {
  const subtotalCents = lineItems
    .filter((i) => i.amountCents > 0)
    .reduce((sum, i) => sum + i.amountCents, 0);

  const discountCents = lineItems
    .filter((i) => i.amountCents < 0)
    .reduce((sum, i) => sum + Math.abs(i.amountCents), 0);

  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

/**
 * Generate a draft invoice from an appointment's booked services/addons/bundles.
 */
export async function generateInvoice(appointmentId: string) {
  const existing = await getInvoiceByAppointment(appointmentId);
  if (existing) return existing;

  const [apptRow] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));

  if (!apptRow) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  const [enriched] = await enrichAppointments([apptRow]);

  if (!enriched) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  // Build line items from appointment data
  const items: { description: string; amountCents: number; type: string }[] = [];

  for (const pet of enriched.pets) {
    const petLabel = pet.petName ? ` (${pet.petName})` : '';

    for (const svc of pet.services) {
      items.push({
        description: `${svc.serviceName}${petLabel}`,
        amountCents: svc.priceAtBookingCents,
        type: 'service',
      });
    }

    for (const addon of pet.addons) {
      items.push({
        description: `${addon.serviceName}${petLabel}`,
        amountCents: addon.priceAtBookingCents,
        type: 'addon',
      });
    }

    for (const bundle of pet.bundles) {
      items.push({
        description: `${bundle.bundleName} discount${petLabel}`,
        amountCents: -bundle.discountAppliedCents,
        type: 'bundle_discount',
      });
    }
  }

  const { subtotalCents, discountCents, totalCents } = calcInvoiceTotals(items);

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({
        appointmentId,
        subtotalCents,
        discountCents,
        totalCents,
        status: 'draft',
      })
      .returning();

    if (!invoice) {
      throw createError({ statusCode: 500, message: 'Failed to create invoice' });
    }

    const insertedItems =
      items.length > 0
        ? await tx
            .insert(invoiceLineItems)
            .values(items.map((item) => ({ invoiceId: invoice.id, ...item })))
            .returning()
        : [];

    return { ...invoice, lineItems: insertedItems };
  });
}

/**
 * Get an invoice by appointment ID, or return null if none exists.
 */
export async function getInvoiceByAppointment(appointmentId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.appointmentId, appointmentId));

  if (!invoice) return null;

  const [lineItems, paymentRows] = await Promise.all([
    db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoice.id)),
    db
      .select()
      .from(payments)
      .where(eq(payments.appointmentId, appointmentId))
      .orderBy(asc(payments.createdAt)),
  ]);

  return { ...invoice, lineItems, payments: paymentRows };
}

/**
 * Get an invoice by its own ID.
 */
export async function getInvoice(invoiceId: string) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoice.id));

  return { ...invoice, lineItems };
}

/**
 * Full-replace line items on a draft invoice and recompute totals.
 */
export async function updateInvoiceLineItems(invoiceId: string, lineItems: InvoiceLineItemInput[]) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (invoice.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft invoices can be edited' });
  }

  const { subtotalCents, discountCents, totalCents } = calcInvoiceTotals(lineItems);

  return db.transaction(async (tx) => {
    await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));

    const insertedItems = await tx
      .insert(invoiceLineItems)
      .values(lineItems.map((item) => ({ invoiceId, ...item })))
      .returning();

    await tx
      .update(invoices)
      .set({ subtotalCents, discountCents, totalCents })
      .where(eq(invoices.id, invoiceId));

    return {
      ...invoice,
      subtotalCents,
      discountCents,
      totalCents,
      lineItems: insertedItems,
    };
  });
}

/**
 * Finalize a draft invoice (locks editing).
 */
export async function finalizeInvoice(invoiceId: string) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (invoice.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft invoices can be finalized' });
  }

  const [updated] = await db
    .update(invoices)
    .set({ status: 'finalized' })
    .where(eq(invoices.id, invoiceId))
    .returning();

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  return { ...updated, lineItems };
}
