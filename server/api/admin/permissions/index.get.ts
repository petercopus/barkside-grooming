import { db } from '~~/server/db';
import { permissions } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  requireAuth(event);
  const allPermissions = await db.select().from(permissions).orderBy(permissions.key);
  return { permissions: allPermissions };
});
