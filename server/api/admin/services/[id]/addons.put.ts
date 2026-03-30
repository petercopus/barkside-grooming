import {
  getBaseServiceAddonLinks,
  getService,
  getServiceAddonLinks,
  setBaseServiceAddonLinks,
  setServiceAddonLinks,
} from '~~/server/services/service.service';

import {
  updateBaseServiceAddonsSchema,
  updateServiceAddonsSchema,
} from '~~/shared/schemas/service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const id = Number(getRouterParam(event, 'id'));
  const service = await getService(id);
  const body = await readBody(event);

  if (service.isAddon) {
    const { baseServiceIds } = updateServiceAddonsSchema.parse(body);
    await setServiceAddonLinks(id, baseServiceIds);
    return { baseServiceIds: await getServiceAddonLinks(id) };
  } else {
    const { addonServiceIds } = updateBaseServiceAddonsSchema.parse(body);
    await setBaseServiceAddonLinks(id, addonServiceIds);
    return { addonServiceIds: await getBaseServiceAddonLinks(id) };
  }
});
