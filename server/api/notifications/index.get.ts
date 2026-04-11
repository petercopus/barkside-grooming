import { listNotifications } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const notifications = await listNotifications(user.id);

  return { notifications };
});
