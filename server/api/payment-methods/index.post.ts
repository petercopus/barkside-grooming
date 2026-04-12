import { savePaymentMethod } from '~~/server/services/payment.service';
import { savePaymentMethodSchema } from '~~/shared/schemas/payment';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = savePaymentMethodSchema.parse(body);
  const paymentMethod = await savePaymentMethod(user.id, input.stripePaymentMethodId);

  return { paymentMethod };
});
