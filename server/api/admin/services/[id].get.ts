import { getService, getServicePricing } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const id = Number(getRouterParam(event, 'id'));
  const service = await getService(id);
  const pricing = await getServicePricing(id);
  return { service, pricing };
});
