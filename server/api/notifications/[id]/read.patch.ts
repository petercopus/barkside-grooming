import { markAsRead } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  await markAsRead(id, user.id);

  return { success: true };
});
