import { listBundles } from '~~/server/services/bundle.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const bundles = await listBundles(true);
  return { bundles };
});
