import { updateCustomer } from '~~/server/services/customer.service';
import { updateCustomerSchema } from '~~/shared/schemas/customer';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = updateCustomerSchema.parse(body);

  const updated = await updateCustomer(user.id, input);
  return { user: updated };
});
