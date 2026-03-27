import { listRoles } from '~~/server/services/role.service';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const roles = await listRoles();
  return { roles };
});
