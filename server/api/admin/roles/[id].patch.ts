import { updateRole } from '~~/server/services/role.service';
import { updateRoleSchema } from '~~/shared/schemas/role';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'role:manage');

  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const input = updateRoleSchema.parse(body);
  const role = await updateRole(id, input);

  return { role };
});
