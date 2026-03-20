import { db } from '~~/server/db';
import { roles } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'employee:manage');

  const allRoles = await db.select().from(roles);
  return { roles: allRoles };
});
