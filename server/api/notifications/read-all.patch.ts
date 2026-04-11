import { markAllAsRead } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  await markAllAsRead(user.id);

  return { success: true };
});
