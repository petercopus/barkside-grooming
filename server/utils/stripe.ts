import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function initStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    console.warn('[stripe] No secret key configured - Stripe disabled');
    return;
  }

  stripe = new Stripe(key);

  console.log('[stripe] Client initialized');
}

function getStripe(): Stripe {
  if (!stripe) {
    throw createError({ statusCode: 500, message: 'Stripe not initialized' });
  }

  return stripe;
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const customer = await getStripe().customers.create({ email, name });
  return customer.id;
}

export async function createSetupIntent(stripeCustomerId: string): Promise<string | null> {
  const setupIntent = await getStripe().setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
  });

  return setupIntent.client_secret;
}

export async function createOffSessionPaymentIntent(
  stripeCustomerId: string,
  paymentMethodId: string,
  amountCents: number,
  metadata?: Record<string, string>,
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata,
  });

  return paymentIntent;
}

export async function retrievePaymentMethod(
  paymentMethodId: string,
): Promise<Stripe.PaymentMethod> {
  const paymentMethod = getStripe().paymentMethods.retrieve(paymentMethodId);
  return paymentMethod;
}

export async function detachPaymentMethod(paymentMethodId: string): Promise<void> {
  await getStripe().paymentMethods.retrieve(paymentMethodId);
}

export async function createRefund(
  paymentIntentId: string,
  amountCents?: number,
): Promise<Stripe.Refund> {
  const refund = await getStripe().refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });

  return refund;
}
