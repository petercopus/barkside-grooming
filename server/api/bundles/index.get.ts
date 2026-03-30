import { listBundles } from '~~/server/services/bundle.service';

export default defineEventHandler(async (event) => {
  const bundles = await listBundles(false);
  return { bundles };
});
