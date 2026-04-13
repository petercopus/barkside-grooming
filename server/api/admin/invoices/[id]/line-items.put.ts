import { updateInvoiceLineItems } from '~~/server/services/invoice.service';
import { updateInvoiceLineItemsSchema } from '~~/shared/schemas/payment';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = updateInvoiceLineItemsSchema.parse(body);
  const invoice = await updateInvoiceLineItems(id, input.lineItems);

  return { invoice };
});
