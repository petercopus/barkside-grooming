import { deletePaymentMethod } from '~~/server/services/payment.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  await deletePaymentMethod(user.id, id);

  return { success: true };
});
