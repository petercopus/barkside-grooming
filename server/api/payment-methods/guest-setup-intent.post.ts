export default defineEventHandler(async () => {
  const stripeCustomerId = await createStripeCustomer();
  const clientSecret = await createSetupIntent(stripeCustomerId);

  return { clientSecret, stripeCustomerId };
});
