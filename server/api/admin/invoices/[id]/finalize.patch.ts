import { finalizeInvoice } from '~~/server/services/invoice.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const invoice = await finalizeInvoice(id);

  return { invoice };
});
