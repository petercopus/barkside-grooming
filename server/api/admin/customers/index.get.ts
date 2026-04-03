import { listCustomers } from '~~/server/services/customer.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'customer:read');
  const { search } = getQuery(event);
  const customers = await listCustomers(search as string | undefined);

  return { customers };
});
