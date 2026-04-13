import { ensureStripeCustomer } from '~~/server/services/payment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const stripeCustomerId = await ensureStripeCustomer(user.id);
  const clientSecret = await createSetupIntent(stripeCustomerId);

  return { clientSecret };
});
