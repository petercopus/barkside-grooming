import { getServicePricing, listServices } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const serviceList = await listServices(true);

  const services = await Promise.all(
    serviceList.map(async (s) => ({
      ...s,
      pricing: await getServicePricing(s.id),
    })),
  );

  return { services };
});
