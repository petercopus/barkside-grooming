import { createRole } from '~~/server/services/role.service';
import { createRoleSchema } from '~~/shared/schemas/role';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'role:manage');
  const body = await readBody(event);
  const input = createRoleSchema.parse(body);
  const role = await createRole(input);

  return { role };
});
