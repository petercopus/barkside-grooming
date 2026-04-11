import { getServicePricing, listServices } from '~~/server/services/service.service';

export default defineEventHandler(async () => {
  // fetch active services
  const serviceList = await listServices(false);

  // attach pricing
  const servicesWithPricing = await Promise.all(
    serviceList.map(async (s) => ({
      ...s,
      pricing: await getServicePricing(s.id),
    })),
  );

  return { services: servicesWithPricing };
});
