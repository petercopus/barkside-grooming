import { setDefaultPaymentMethod } from '~~/server/services/payment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  await setDefaultPaymentMethod(user.id, id);

  return { success: true };
});
