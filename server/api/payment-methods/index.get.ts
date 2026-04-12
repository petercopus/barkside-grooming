import { listPaymentMethods } from '~~/server/services/payment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const paymentMethods = await listPaymentMethods(user.id);

  return { paymentMethods };
});
