import { setServicePricing } from '~~/server/services/service.service';
import { updateServicePricingSchema } from '~~/shared/schemas/service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');

  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const input = updateServicePricingSchema.parse(body);
  const pricing = await setServicePricing(id, input.pricing);

  return { pricing };
});
