import { updateCustomer } from '~~/server/services/customer.service';
import { updateCustomerSchema } from '~~/shared/schemas/customer';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'customer:manage');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = updateCustomerSchema.parse(body);

  const customer = await updateCustomer(id, input);

  return { customer };
});
