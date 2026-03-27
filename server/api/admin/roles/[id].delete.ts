import { deleteRole } from '~~/server/services/role.service';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'role:manage');

  const id = Number(getRouterParam(event, 'id'));
  await deleteRole(id);

  return { success: true };
});
