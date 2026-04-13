import { getInvoiceByAppointment } from '~~/server/services/invoice.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'booking:read:all');
  const id = getRouterParam(event, 'id')!;
  const invoice = await getInvoiceByAppointment(id);

  return { invoice };
});
