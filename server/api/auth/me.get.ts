import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const permissions: string[] = event.context.permissions ?? [];
  return { user, permissions };
});
