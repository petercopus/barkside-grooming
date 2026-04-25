import { listBundles } from '~~/server/services/bundle.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'service:manage');
  const bundles = await listBundles(true);
  return { bundles };
});
