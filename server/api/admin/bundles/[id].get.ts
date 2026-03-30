import { getBundle } from '~~/server/services/bundle.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const id = Number(getRouterParam(event, 'id'));
  const bundle = await getBundle(id);
  return { bundle };
});
