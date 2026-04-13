import { z } from 'zod';

const guestSetupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = guestSetupSchema.parse(body);

  const stripeCustomerId = await createStripeCustomer(
    input.email,
    `${input.firstName} ${input.lastName}`,
  );

  const clientSecret = await createSetupIntent(stripeCustomerId);

  return { clientSecret, stripeCustomerId };
});
