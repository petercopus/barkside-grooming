import { getUnreadCount } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const count = await getUnreadCount(user.id);

  return { count };
});
