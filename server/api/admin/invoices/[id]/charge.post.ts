import { chargeAppointment } from '~~/server/services/payment.service';
import { checkoutSchema } from '~~/shared/schemas/payment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = checkoutSchema.parse(body);
  const payment = await chargeAppointment(id, input.tipCents);

  return { payment };
});
