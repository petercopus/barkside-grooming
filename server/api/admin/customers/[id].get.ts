import { getCustomerWithRelations } from '~~/server/services/customer.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'customer:read');
  const id = getRouterParam(event, 'id')!;
  const customer = await getCustomerWithRelations(id);

  return { customer };
});
