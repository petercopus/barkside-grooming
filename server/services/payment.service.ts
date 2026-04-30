import { and, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  appointments,
  customerPaymentMethods,
  invoices,
  payments,
  users,
} from '~~/server/db/schema';
import { getInvoice } from '~~/server/services/invoice.service';
import { sendNotification } from '~~/server/services/notification.service';

export async function ensureStripeCustomer(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' });
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // customer doesnt have stripeCustomerId yet
  const newId = await createStripeCustomer({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  });

  await db.update(users).set({ stripeCustomerId: newId }).where(eq(users.id, userId));

  return newId;
}

export async function savePaymentMethod(userId: string, stripePaymentMethodId: string) {
  await ensureStripeCustomer(userId);
  const pm = await retrievePaymentMethod(stripePaymentMethodId);

  if (!pm) {
    throw createError({ statusCode: 404, message: 'Payment method not found' });
  }

  if (!pm.card) {
    throw createError({ statusCode: 400, message: 'Payment method is not a card' });
  }

  const existingPaymentMethods = await db
    .select()
    .from(customerPaymentMethods)
    .where(eq(customerPaymentMethods.userId, userId));

  const isDefault = existingPaymentMethods.length === 0;
  const [paymentMethod] = await db
    .insert(customerPaymentMethods)
    .values({
      userId,
      stripePaymentMethodId,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: isDefault,
    })
    .returning();

  return paymentMethod;
}

export async function listPaymentMethods(userId: string) {
  const paymentMethods = await db
    .select()
    .from(customerPaymentMethods)
    .where(eq(customerPaymentMethods.userId, userId))
    .orderBy(desc(customerPaymentMethods.createdAt));

  return paymentMethods;
}

export async function deletePaymentMethod(userId: string, paymentMethodId: string) {
  const [row] = await db
    .select({
      id: customerPaymentMethods.id,
      stripePaymentMethodId: customerPaymentMethods.stripePaymentMethodId,
      isDefault: customerPaymentMethods.isDefault,
    })
    .from(customerPaymentMethods)
    .where(
      and(
        eq(customerPaymentMethods.id, paymentMethodId),
        eq(customerPaymentMethods.userId, userId),
      ),
    );

  if (!row) {
    throw createError({ statusCode: 404, message: 'Payment method not found' });
  }

  await detachPaymentMethod(row.stripePaymentMethodId);

  await db.delete(customerPaymentMethods).where(eq(customerPaymentMethods.id, row.id));

  if (row.isDefault) {
    const [newDefault] = await db
      .select({ id: customerPaymentMethods.id })
      .from(customerPaymentMethods)
      .where(eq(customerPaymentMethods.userId, userId))
      .orderBy(desc(customerPaymentMethods.createdAt))
      .limit(1);

    if (!newDefault) return;

    await setDefaultPaymentMethod(userId, newDefault.id);
  }
}

export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
  await db.transaction(async (trx) => {
    await trx
      .update(customerPaymentMethods)
      .set({ isDefault: false })
      .where(eq(customerPaymentMethods.userId, userId));

    await trx
      .update(customerPaymentMethods)
      .set({ isDefault: true })
      .where(eq(customerPaymentMethods.id, paymentMethodId));
  });
}

/**
 * Charge an appointments card
 */
export async function chargeAppointment(invoiceId: string, tipCents: number) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status !== 'finalized') {
    throw createError({ statusCode: 400, message: 'Invoice must be finalized before charging' });
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, invoice.appointmentId!));

  if (!appointment) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  if (!appointment.paymentMethodId || !appointment.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      message: 'No payment method on file for this appointment',
    });
  }

  const totalCharge = invoice.totalCents + tipCents;

  // charge
  const paymentIntent = await createOffSessionPaymentIntent(
    appointment.stripeCustomerId,
    appointment.paymentMethodId,
    totalCharge,
    {
      invoiceId: invoice.id,
      appointmentId: appointment.id,
      tip: String(tipCents),
    },
  );

  // update invoice
  await db
    .update(invoices)
    .set({
      tipCents,
      totalCents: totalCharge,
      status: 'paid',
      paidAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // insert payment record
  const [payment] = await db
    .insert(payments)
    .values({
      appointmentId: appointment.id,
      amountCents: totalCharge,
      tipCents,
      status: 'captured',
      provider: 'stripe',
      transactionId: paymentIntent.id,
      paymentMethodId: appointment.paymentMethodId,
      stripeCustomerId: appointment.stripeCustomerId,
    })
    .returning();

  return payment;
}

/* ─────────────────────────────────── *
 * Refunds
 * ─────────────────────────────────── */

/**
 * Refund a paid invoice in full or in part.
 */
export async function refundInvoice(invoiceId: string, amountCents?: number) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status !== 'paid') {
    throw createError({
      statusCode: 400,
      message: 'Only paid invoices can be refunded',
    });
  }

  if (!invoice.appointmentId) {
    throw createError({ statusCode: 400, message: 'Invoice has no appointment' });
  }

  const captured = await db
    .select()
    .from(payments)
    .where(and(eq(payments.appointmentId, invoice.appointmentId), eq(payments.status, 'captured')));

  if (captured.length === 0) {
    throw createError({ statusCode: 400, message: 'No captured payment to refund' });
  }

  const charge = captured[0]!;
  const remainingCents = captured.reduce((sum, p) => sum + p.amountCents, 0);
  const refundAmount = amountCents ?? remainingCents;

  if (refundAmount <= 0) {
    throw createError({ statusCode: 400, message: 'Refund amount must be positive' });
  }

  if (refundAmount > remainingCents) {
    throw createError({
      statusCode: 400,
      message: 'Refund exceeds remaining captured amount',
    });
  }

  if (charge.provider === 'stripe') {
    if (!charge.transactionId) {
      throw createError({ statusCode: 400, message: 'Original charge has no transaction id' });
    }

    await createRefund(charge.transactionId, refundAmount);
  }

  const isFullRefund = refundAmount === remainingCents;

  await db.transaction(async (tx) => {
    if (isFullRefund) {
      // flip every captured payment for this appointment to refunded
      for (const p of captured) {
        await tx.update(payments).set({ status: 'refunded' }).where(eq(payments.id, p.id));
      }
    } else {
      await tx.insert(payments).values({
        appointmentId: invoice.appointmentId,
        amountCents: -refundAmount,
        status: 'refunded',
        provider: charge.provider,
        transactionId: charge.transactionId,
        paymentMethodId: charge.paymentMethodId,
        stripeCustomerId: charge.stripeCustomerId,
      });
    }

    await tx
      .update(invoices)
      .set({ status: isFullRefund ? 'refunded' : 'paid' })
      .where(eq(invoices.id, invoiceId));
  });

  const [appt] = await db
    .select({ customerId: appointments.customerId })
    .from(appointments)
    .where(eq(appointments.id, invoice.appointmentId));

  if (appt?.customerId) {
    await sendNotification({
      userId: appt.customerId,
      category: 'payment_refunded',
      title: isFullRefund ? 'Refund issued' : 'Partial refund issued',
      body: isFullRefund
        ? 'Your appointment has been fully refunded.'
        : `A refund of $${(refundAmount / 100).toFixed(2)} has been issued.`,
    }).catch((err) => console.error(`[refund] notify failed for ${invoiceId}:`, err));
  }

  return { refundedCents: refundAmount, isFullRefund };
}

/**
 * Manual payment for appointments
 */
export async function recordManualPayment(invoiceId: string, tipCents: number) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status !== 'finalized') {
    throw createError({
      statusCode: 400,
      message: 'Invoice must be finalized before recording payment',
    });
  }

  const totalCharge = invoice.totalCents + tipCents;

  // update invoice
  await db
    .update(invoices)
    .set({
      tipCents,
      totalCents: totalCharge,
      status: 'paid',
      paidAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // insert payment record
  const [payment] = await db
    .insert(payments)
    .values({
      appointmentId: invoice.appointmentId,
      amountCents: totalCharge,
      tipCents,
      status: 'captured',
      provider: 'manual',
    })
    .returning();

  return payment;
}
