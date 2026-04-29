import { createCustomer } from '~~/server/services/customer.service';
import { createCustomerSchema } from '~~/shared/schemas/customer';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'customer:manage');
  const body = await readBody(event);
  const input = createCustomerSchema.parse(body);

  const customer = await createCustomer(input);

  return { customer };
});
