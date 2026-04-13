import { generateInvoice } from '~~/server/services/invoice.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const invoice = await generateInvoice(id);

  return { invoice };
});
