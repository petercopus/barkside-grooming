import {
  getBaseServiceAddonLinks,
  getService,
  getServiceAddonLinks,
} from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const id = Number(getRouterParam(event, 'id'));
  const service = await getService(id);

  if (service.isAddon) {
    const baseServiceIds = await getServiceAddonLinks(id);
    return { baseServiceIds };
  } else {
    const addonServiceIds = await getBaseServiceAddonLinks(id);
    return { addonServiceIds };
  }
});
