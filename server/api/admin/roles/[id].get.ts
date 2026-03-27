import { getRole } from '~~/server/services/role.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const id = Number(getRouterParam(event, 'id'));
  const role = await getRole(id);
  return { role };
});
