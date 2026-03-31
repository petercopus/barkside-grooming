import { getAddonMap } from '~~/server/services/service.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const addonMap = await getAddonMap();
  return { addonMap };
});
