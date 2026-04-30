import { refundInvoice } from '~~/server/services/payment.service';
import { refundSchema } from '~~/shared/schemas/payment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = refundSchema.parse(body);

  const result = await refundInvoice(id, input.amountCents);
  return { result };
});
