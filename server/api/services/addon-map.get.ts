import { getAddonMap } from '~~/server/services/service.service';

export default defineEventHandler(async () => {
  const addonMap = await getAddonMap();
  return { addonMap };
});
